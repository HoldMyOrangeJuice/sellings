// this class defines all page content changing actions
class Renderer
{
    static wipe_content()
    {
        // scroll to top to avoid loading like half of table
        DOM.tableContainer().empty();
        console.log("scroll");
        window.scrollTo(0, 0);
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
        if (ADMIN)
            ensure_textarea_size();
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

    static open_photo_view_window(elem_clicked, parent)
    {
        // each element of parent has tags role=image_icon and path.
        photos = []
        let current = null;

        let i = 0;

        for (let elem of parent.children())
        {
            let path = $(elem).data('path')
            photos.push(path);

            if (elem == elem_clicked)
            {
                current = i;
            }
            i++;

        }

        let context = {
            active: photos[current],
            icons: photos
        };

        new Element('body').addComponent(CManager.ImageViewer, context);
        this.handleOverlayOpen();

        listen_to_swaps($('#image_viewer'),
        (dir)=>{if (dir == "<-")
        prev();
        else next();
        })


        const show = (i) =>
        {
            $('#image_viewer').find('.active').removeClass('active');
            $($('#image_viewer').find('#image_icons').children().get(i)).addClass('active');
            let image = $('#image_main');
            let path = get_image_path(photos[i]);

            if (image[0]?.nodeName == 'DIV')
            {
                image.css("background-image", `url('${path}')`)
            }
            else
            {
                image.attr('src', path);
            }
        }



        $('body').on('keydown', e=>{if (e.key == 'Escape'){this.close_image_view_window();}})
        $('.img-icon').on('click', e=>{show($(e.target).index())})
        $('#image_viewer').on('click', e=>{if ($(e.target).hasClass("modal-backdrop")){this.close_image_view_window()}})

        const next = ()=>
        {
            current++;
            if (current >= photos.length)
            {
                current = 0;
            }
            show(current);
        }
        const prev = ()=>
        {
            current--;
            if (current < 0)
            {
                current = photos.length-1;
            }
            show(current);
        }

        // bind handlers
        $('#viewer_prev').on('keydown', (e)=>{ if( !$('#image_viewer').length)return; console.log(e.key); if (e.key == "ArrowLeft"){prev}; if (e.key == "ArrowRight"){next}})
        $('#viewer_prev').on('click', prev);
        $('#viewer_next').on('click', next);

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
            Renderer.close_fav_table();
        }
        else
        {
            //$('body').css('position', 'fixed')
            let items = await Networker.get_fav_items();
            Renderer.show_fav_table(items)
        }
    }

    static show_feedback(success, message)
    {
        let mwindow = $("#notificationModal");
        let mtitle = $("#notification-title");
        let mbody = $("#notification-body");

        let icon = success?'<span>&#9745;</span>':'<span>&#9888;</span>'

        if (typeof message == "string")
        {
            mtitle.html(icon);
            mbody.html(message);
        }

        if (typeof message == "object")
        {
            let title = message.title;
            let content = message.content;

            mtitle.html(icon + " " + title);
            mbody.html(content);
        }
        mwindow.modal({show: true});
    }
}
