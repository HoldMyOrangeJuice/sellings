import DOM from "./dom"
import Searcher from "./searcher"
import CManager from "../../templates/vtl/lib/core/manager/ComponentManager"
import Element from "../../templates/vtl/lib/core/Element"

import registerSwapListener from "../../swap"

import {isMobile, getImagePath} from "../utils"


// TODO remove networker from here. why is it in renderer???
import Networker from "./network/networker"
// remove page utils too
import PageActions from "./page_utils"

// this class defines all page content changing actions
class Renderer
{
    static renderMainFrame()
    {
        DOM.main().addComponent(CManager.MainFrame);
    }

    static hide_navbar()
    {
        $('nav.sticky').hide();
    }

    static show_navbar()
    {
        $('nav.sticky').show();
    }

    static wipe_content()
    {
        DOM.tableContainer().empty();
    }

    static delete_item(item_id)
    {
        if (!ADMIN)return;

        // delete main item data
        $(`[data-item_id=${item_id}][data-role='main_item_data']`).remove();
        // delete photo data
        $(`[data-item_id=${item_id}][data-role='photo_item_data']`).remove();
    }

    // place item where it needs to be placed in frame
    static fill_frame(category, item)
    {
        if ( Searcher.sorts_by_category() )
        {
            // append to category
            if ( DOM.catFrame(category).length == 0 )
            {
                DOM.tableContainer().addComponent(CManager.CategoryFrame, {category})
            }
            DOM.catFrame(category).addComponent(CManager.FrameEntry, {item})
        }
        else
        {
            // append to end
            if ( DOM.monoFrame().length == 0 )
            {
                DOM.tableContainer().addComponent(CManager.MonoFrame)
            }
            DOM.monoFrame().addComponent(CManager.FrameEntry, {item} );
        }
    }

    // this method places categorized items where they need to be
    // and registers listeners for them
    static add_to_table(categorized_items)
    {
        for (let [category, items] of categorized_items)
        {
            for (let item of items)
            {
                this.fill_frame(category, item);
            }
        }
        //if (ADMIN)
        //    ensure_textarea_size();
    }

    static toggle_contacts()
    {
        if ( $('.static-contacts > .static-bottom-entry').hasClass("focuded-contacts") )
        {
            Renderer.collapse_contacts();
            return;
        }
        Renderer.stretch_contacts();
    }

    static stretch_contacts()
    {
        $('#toggleContacts').modal("show");
    }

    static collapse_contacts()
    {
        $('#toggleContacts').modal("hide");
    }

    static show_fav_table(fav_items)
    {
        function offsetBottom(el, i) { i = i || 0; return $(el)[i].getBoundingClientRect().bottom }

        let navbar = $(".mynavbar")
        let bottom = offsetBottom(navbar[0]);

        $(`#fav_container`).empty();
        $(`#fav_container`).css("height", $(window).height() - bottom + "px")
        $(`#fav_container`).addClass('fav_opened')

        PageActions.lock_scroll();
        DOM.favouriteTable().addComponent(CManager.FavouriteTable, {fav_items})
    }

    static handleOverlayOpen()
    {
        if (isMobile())
        $(".mynavbar").css("top", "-" + ($(".mynavbar").height()+ 20) + "px");
        $("body").addClass("modal-open")
    }


    static show(idx)
    {
        $('#image_viewer').find('.active').removeClass('active');
        let active_preview = $(`[data-role='image-preview'][data-photo-index=${idx}]`);
        let active_path = active_preview.data("path")

        active_preview.addClass('active')

        let image = $('#image_main');
        image.attr('src', getImagePath(active_path));
        image.data('path', active_path)
    }

    static next()
    {
        if (!$('#image_main').length)
            return;

        let active_path = $('#image_main').data("path");
        let cur = $(`[data-role='image-preview'][data-path='${active_path}']`).data('photo-index')
        let nxt = $(`[data-role='image-preview'][data-photo-index=${cur+1}]`)
        if (nxt.length)
            this.show(cur+1);
    }

    static prev()
    {
        if (!$('#image_main').length)
            return;

        let active_path = $('#image_main').data("path");
        let cur = $(`[data-role='image-preview'][data-path='${active_path}']`).data('photo-index')
        let prv = $(`[data-role='image-preview'][data-photo-index=${cur-1}]`)
        if (prv.length)
            this.show(cur-1);
    }

    static open_photo_view_window(item_id, active_index)
    {
        let photos = [];
        let photo_elements = $(`[data-role="image-icon"][data-item_id=${item_id}]`)

        for (let e of photo_elements)
        {
            photos.push($(e).data('path'));
        }

        let context = {
            active: photos[parseInt(active_index)],
            icons: photos
        };

        new Element('body').addComponent(CManager.ImageViewer, context);
        this.handleOverlayOpen();

        registerSwapListener($('#image_main'), dir => dir == "->" ? this.prev() : this.next());


        $('[data-role="image-preview"]').on('click', e=>{this.show($(e.currentTarget).data("photo-index"))})
        $('#viewer_prev').on('click', Renderer.prev.bind(Renderer));
        $('#viewer_next').on('click', Renderer.next.bind(Renderer));
    }

    static close_image_view_window()
    {
        $("#image_viewer").remove();
        PageActions.unlock_scroll();
    }

    static close_fav_table()
    {
        $(`#fav_container`).removeClass('fav_opened');
        $(`#fav_container`).css("height", 0)

        PageActions.unlock_scroll();
    }

    static async toggle_fav_tab()
    {
        if ($('#fav_container').hasClass('fav_opened'))
        {
            this.close_fav_table();
        }
        else
        {
            //todo: only render empty table here and do it sync without waitung for anything
            let items = await Networker.get_fav_items();
            this.show_fav_table(items)
        }
    }

    static async loadHeight(height)
    {
        let c = 0;
        while($(document).height() < height && !Searcher.done())
        {
            let res = await Searcher.load_more();
            console.log("loaded", res);
            c++;
            if (c == 100){
                console.warn("Could not load enough in 100 iterations (~15 should be max)");
                break;
            }
        }
    }

    static async restoreHeight() {
        let height = localStorage[`SCROLL_${document.location.pathname}`] || "0";
        height = parseInt(height);
        await this.loadHeight(height).then( ()=>scroll(0, height) )
    }

    static show_alert(success, title, message, remove_after)
    {
        let id = `alert-id-${Math.round(Math.random()*100)}`
        let alert_html = `<div id='${id}' class="alert ${success ? "alert-success" : "alert-danger"} alert-dismissible fade">
        <strong>${title}</strong><span class="ml-5 content">${message}</span>
        <button type="button" class="close" data-dismiss="alert">&times;</button>
        </div>`;
        $("#alert-container").append(alert_html);
        let e = $(`#${id}`);
        console.log(e);
        e.addClass('show');

        if (remove_after === -1)
            return;

        if (remove_after || success)
        {
            setTimeout(()=>{e.remove();}, remove_after || 10000)
        }
    }

    static show_feedback(success, message, modal)
    {
        let mwindow = $("#notificationModal");
        let mtitle = $("#notification-title");
        let mbody = $("#notification-body");

        let icon = success?'<i class="fa fa-check" aria-hidden="true"></i>':'<i class="fa fa-times" aria-hidden="true"></i>';
        let title = icon;
        let content = "";

        if (typeof message == "string")
        {
            content = message;
        }

        if (typeof message == "object")
        {
            title += message.title
            content = message.content
        }
        if (modal)
        {
            mtitle.html(title);
            mbody.html(content);
            mwindow.modal({show: true});
        }
        else
        {
            this.show_alert(success, title, content)
        }
    }

    static edit_favourite(item_id, subcat_idx, is_favourite)
    {
        let elems = $(`[data-item_id='${item_id}'][data-subcat_idx=${subcat_idx}][data-role='toggle-fav']`);

        is_favourite?elems.addClass('fav'):elems.removeClass('fav')
        elems.data("fav", is_favourite);

        elems.html(is_favourite?
            '<span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>':
            '<span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>'
        );

        let subcat_trs = $(`[data-role='subcat_entry'][data-item_id='${item_id}'][data-subcat_id=${subcat_idx}]`)
        is_favourite?subcat_trs.addClass('fav'):subcat_trs.removeClass('fav');
    }
}

export default Renderer
