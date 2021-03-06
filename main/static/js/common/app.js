"use strict"

function scrolled()
{
    return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
}

function isMobile()
{
  try{
      document.createEvent("TouchEvent");
      return true;
  }
  catch(e){ return false; }
}



const DEF_BLANK_VAL_TEXT = "-";
const DEF_BLANK_VAL_NUM = "?";
const SCREENS_TILL_FETCH = 3;

const QUERY_URL = "/api/user/make_query";
const GET_FAVOURITE_URL = "/api/user/get_favourite";
const ORDER_URL = "/api/user/order";
const EDIT_FAVOURITE_URL = "/api/user/edit_favourite";
const HINTS_URL = "/api/user/get_hints"

const LANG = {
    edit: "Редактировать",
    add: "Добавить",
    delete: "Удалить",
    save: "Сохранить",
    actions: 'Действия',
    cancel: 'Отмена',
    name: "Наименование",
    cats: "Подкатегории",
    cond: "Состояние",
    desc: "Описание",
    category:"категории"
}
function uuid()
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function get_image_path(filename)
{
    return `${MEDIA_URL}images/items/${filename}`
}

function get_min_image_path(filename)
{
    return `${MEDIA_URL}images/min/${filename}`
}

class Searcher
{

    static query = undefined;
    static cat = null;
    static id=null;
    static part = 0;
    static max_parts = 1;
    static items = []
    static fetch_blocked = false;

    static sorts_by_category()
    {
        return this.cat != null || !this.query;
    }

    static make_query({q=null, cat=null, id=null, silent=false})
    {
        if (!silent)
            PageActions.scroll_to('#split');

        this.items = [];
        $('#search').val(q || CATS[cat]);

        this.max_parts = 1;
        if (q != null)
        {
            if (q == "")
                PageActions.set_url(`/`);
            else
                PageActions.set_url(`/?q=${q}`);
            this.query = q;
            this.category = null;
            this.item_id=null;
            this.part = 0;
        }
        else if (cat != null)
        {
            PageActions.set_url(`/?cat=${cat}`);
            this.query = null;
            this.item_id=null;
            this.category = cat;
            this.part = 0;
        }
        else if (id != null)
        {
            if (!window.location.href.includes("/item"))
                PageActions.set_url(`/?id=${id}`);
            this.query = null;
            this.category = null;
            this.item_id=id;
            this.part = 0;
        }
        Renderer.wipe_content();

        this.load_more();

    }

    static async load_more()
    {
        if (this.disabled || this.fetch_blocked || this.part >= this.max_parts)return;

        this.fetch_blocked = true;

        let data = {part: this.part, query: this.query, category: this.category, item_id: this.item_id};

        let [categorized_items, parts, total] = await Networker.fetch(data);

        this.fetch_blocked = false;

        this.part += 1;
        this.max_parts = parts;

        // items = [ [category, [items]], [category, [items]], [category, [items]] ]
        for (let [category, items] of categorized_items)
            this.items.push(...items);

        if (parts == 0)
        {
            // empty query for first page
            DOMManager.get_empty_query_banner().html(`Ни один предмет не подошел к запросу<br>
            "${ Searcher.query || CATS[Searcher.cat] || Searcher.id }".
            <br>`)
        }
        else
        {
            DOMManager.get_empty_query_banner().html(`Найдено результатов: ${total}`);
            Renderer.add_to_table(categorized_items)
        }
    }

    static async get_item(item_id)
    {
        for (let item of this.items)
        {
            if (item.id == item_id)
            {
                return item;
            }
        }
        return await Searcher.fetch({id: item_id})[0];
    }
}
class NetworkerBase
{
    static prehandle_response(response)
    {
         console.log("response: ", response);
         if (response.alert)
         {
              Renderer.show_feedback(response.success, response.message);
         }
    }

    static async makeRequest(method, url, data)
    {
        if (typeof data === "object")
        {
            for (let key of Object.keys(data))
            {
                if (data[key] == null || data[key] == undefined){
                    delete data[key];
                }
            }
        }
        if (!url)
        {
            url = "/api"
        }

        if (method == 'GET')
        {

            let ser = typeof data == 'string'? data : jQuery.param( data )
            let response = await fetch(`${url}?${ser}`, {
                method: method,
            });
            return response;
        }
        else
        {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.onload = function () {
                  if (this.status >= 200 && this.status < 300)
                  {
                      let response = JSON.parse(xhr.response);
                      resolve(response);

                  } else {
                    reject({
                      status: this.status,
                      statusText: xhr.statusText
                    });
                  }
                };
                xhr.onerror = function () {
                  reject({
                    status: this.status,
                    statusText: xhr.statusText
                  });
                };
                xhr.send(data);
              });
        }
    }

    static async POST(data, url)
    {
        if (! (data instanceof FormData) )
        {
            let fd = new FormData();
            for ( let key of Object.keys(data) )
            {
                fd.append(key, data[key]);
            }
            data = fd;
        }
        data.append('csrfmiddlewaretoken', document.getElementsByName("csrfmiddlewaretoken")[0].value);

        let response = await this.makeRequest('POST', url, data);
        this.prehandle_response(response);
        return response;
    }

    static async GET(data, url)
    {
        let resp = await this.makeRequest('GET', url, data);
        let response = await resp.json();
        this.prehandle_response(response);
        return response;
    }
}

class Networker extends NetworkerBase
{
    static async fetch({item_id=null,
                        item_ids=null,
                        query=null,
                        category=null,
                        part_size=10,
                        part=0})
    {
        // same as make query but returns max_data entries
        // and does not change searcher state
        let response = await this.GET({item_id, item_ids, query, category, part_size, part}, QUERY_URL);

        if (response.success)
        {
            return [response.payload.items, response.payload.parts, response.payload.total]
        }
        return [[], 0, 0]
    }

    static async get_hints()
    {
        let data = {"query": $('#search').val()}
        return await this.GET(data, HINTS_URL)
    }

    static async set_fav_state(item_id, subcat_idx, checked)
    {
        return await this.POST( {'item_id': item_id, 'subcat_idx': subcat_idx, 'favourite': checked?"true":"false"}, EDIT_FAVOURITE_URL )
    }

    static async submit_order()
    {
        let data = new FormData($('#orderModal').find('form')[0])
        return Networker.POST(data, ORDER_URL);

    }

    static async get_fav_items()
    {
        let data = await this.GET({}, GET_FAVOURITE_URL);
        return data.payload.items;
    }
}

class PageActions
{
    static set_url(url)
    {
        window.history.pushState({"html":"","pageTitle": ""},"", url);
    }
    static open_in_new_window(path)
    {
        window.open(path);
    }
    static lock_scroll()
    {
        $("body").addClass("modal-open")
    }

    static unlock_scroll()
    {
        $("body").removeClass("modal-open")
    }

    static scroll_to(sel)
    {
        $('html, body').animate({ scrollTop: $(sel).offset().top-138 }, 1000);
    }

    static count_subcats(item_id)
    {
        let i = 0;
        for (let e of $(`[data-subcat_table="${item_id}"]`).find('tbody').children())
        {
            if ( parseInt($(e).data('subcat_id')) >= i )
                i = parseInt($(e).data('subcat_id')) + 1;
        }
        return i;
    }
}

class DOMManager
{
    // main item table
    static get_empty_query_banner()
    {
        return $('#empty-query-banner')
    }

    static get_category_frame(category)
    {
        return $(`[data-category='${category}'][data-role="category-frame"]`)
    }

    // parent of all category containers
    static get_table_container()
    {
        return $(`#table-container`);
    }

    static get_mono_frame()
    {
        return $("#mono-table");
    }

    // order

}

class OrderForm
{
    static messageField = ()=>$("#message-text");
    static idField = ()=>$("#order_form_item_id");
    static subcatField = ()=>$("#order_form_subcat_idx");
    static phoneField = ()=>$("#phone");
    static form = ()=>$('#orderModal').find('form');
    static modal = ()=>$('#orderModal');
    static last_id;

    static clearMessage()
    {
        this.messageField.text("")
    }

    static set_subcat(idx)
    {
        this.subcatField().val(idx);
    }

    static async submit()
    {
        let myform = this.form()[0];
        if (!myform.checkValidity())
        {
            if (myform.reportValidity)
                myform.reportValidity();
            return;
        }

        this.close();
        console.log("close");
        let response = await Networker.submit_order();
        if (response.success)
        {
            this.clearMessage();
        }

        else if (this.last_id)
        {
            let hints = response.payload;

            setTimeout(()=>{
                this.open(this.last_id, undefined);
                this.show_hints(hints);
            }, 500 );

        }
    }

    static show_hints(hints)
    {
        for (let field_name of Object.keys(hints))
        {
            let message = hints[field_name];
            let field = this.form().find(`[name='${field_name}'][type!='hidden']`)
            $( `<p class='order-form-hint'>${message}</p>` ).insertAfter( field );
        }

    }
    static close()
    {
        this.set_subcat(undefined);
        this.modal().modal( "hide" );
        $(".order-form-hint").remove();
    }

    static async open(item_id, subcat_idx)
    {
        this.last_id = item_id;
        let item = await Searcher.get_item(item_id)

        if (subcat_idx === undefined)
        {
            if (item.subcats.length === 1)
            {
                subcat_idx = 0;
                this.set_subcat(subcat_idx);
            }
            else
            {
                let selection = $("#order-subcat-selection")
                let html = "<ul>";
                for (let [idx, subcat] of item.subcats.entries())
                {
                    html += `<li><input type='checkbox'
                                        data-item_id='${item_id}'
                                        data-role='order-subcat-selector'
                                        data-subcat_idx='${idx}'>
                                        ${subcat.code|| "- "} ${subcat.param || "-"}
                             </li>`
                }

                html += "</ul>";
                selection.html(html);
            }
        }
        else
        {
            this.set_subcat(subcat_idx);
        }
        console.log("show");

        $('#order_form_item_id').val(item_id);
        $('#item-data').html(`<span>${item.name}</span> <span>${item.condition || ""}</span>`)
        $('#orderModal').modal('show');

    }
}

// this class defines all page content changing actions
class Renderer
{
    static wipe_content()
    {
        // scroll to top to avoid loading like half of table
        DOMManager.get_table_container().empty();
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
            if ( DOMManager.get_category_frame(category).length == 0 )
            {
                DOMManager.get_table_container().append( HtmlGen.gen_cat_frame(category) )
            }

            DOMManager.get_category_frame(category).append( HtmlGen.gen_frame_entry(item))
        }
        else
        {
            // append to end
            if ( DOMManager.get_mono_frame().length == 0 )
            {
                DOMManager.get_table_container().append( HtmlGen.gen_mono_frame() )
            }
            DOMManager.get_mono_frame().append( HtmlGen.gen_frame_entry(item) );
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
        //$(`#fav_container`).css("top", bottom + "px")
        $(`#fav_container`).css("height", $(window).height() - bottom + "px")
        $(`#fav_container`).addClass('fav_opened')
        PageActions.lock_scroll();
        HtmlGen.gen_fav_table(fav_items);
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

        // show window
        let html = HtmlGen.gen_image_viewer(photos[current], photos);
        $('body').append(html);

        PageActions.lock_scroll();
        listen_to_swaps($('#image_viewer'), (dir)=>{if (dir == "<-")prev();else next();})


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

$(document).on("change", "input[data-role='order-subcat-selector']", (e)=>
{
    if ($(e.target).prop("checked"))
    {
        $("input[data-role='order-subcat-selector']").prop("checked", false );
        $(e.target).prop("checked", true );
        OrderForm.set_subcat( $(e.target).data("subcat_idx") );
    }
    else
    {
        OrderForm.set_subcat(undefined);
    }
});


function edit_favourite(item_id, subcat_idx)
{
    let elem = $(`[data-item_id='${item_id}'][data-subcat_idx=${subcat_idx}][data-role='cart-action']`);
    let subcat = $(`[data-item_id='${item_id}'][data-subcat_id=${subcat_idx}]`);
    let checked = !elem.data('checked')
    if (!checked)
    {
        subcat.removeClass('fav')
    }
    else
    {
        subcat.addClass('fav')
    }
    elem.data('checked', checked);

    let cart_action = checked?'<span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>':
    '<span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>';

    elem.html(cart_action);
    Networker.set_fav_state(item_id, subcat_idx, checked);
}

function handle_image_click(clicked)
{

    let parent = $(clicked).parent();
    // parent contains all image objects
    if (ADMIN)
    {
        handle_adm_image_click(clicked)
    }
    else
    {
        Renderer.open_photo_view_window(clicked, parent);
    }
}





let photos = []
let current = null;


let sc;

$(document).ready(function()
{
    if (ADMIN)
    {
        document.getElementById("file").onchange = (e)=>{ previewImage(document.getElementById("file"), document.getElementById("target"));console.log("show preview") };
    }

    $(window).scroll(function()
    {
        if($(window).scrollTop() + SCREENS_TILL_FETCH * $(window).height() > $(document).height() )
        {
           Searcher.load_more();
        }
   });
});

function query(q)
{
    Searcher.make_query({q: q});
}

function query_cat(c)
{
    Searcher.make_query({cat: c});
}



let currentFocus;
function autocomplete(arr)
{
  let inp = $('#search')[0];
  let val = $(inp).val();
  closeAllLists();
  if (!val) { return false;}
  currentFocus = -1;
  let a = document.createElement("DIV");
  a.setAttribute("id", "searchautocomplete-list");
  a.setAttribute("class", "autocomplete-items");
  inp.parentNode.appendChild(a);

  for (let i = 0; i < arr.length; i++)
  {
      let b = document.createElement("DIV");
      b.innerHTML = arr[i]

      b.addEventListener("click", function(e)
      {
          inp.value = $(e.target).text();
          closeAllLists();
          handle_search_submit();
      });
      a.appendChild(b);
  }
}

function addActive(x) {
  if (!x) return false;
  removeActive(x);
  if (currentFocus >= x.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = (x.length - 1);
  x[currentFocus].classList.add("autocomplete-active");
}

function removeActive(x) {
  for (var i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
  }
}

function closeAllLists(elmnt) {
  let inp = $('#search')[0];
  var x = document.getElementsByClassName("autocomplete-items");
  for (var i = 0; i < x.length; i++) {
    if (elmnt != x[i] && elmnt != inp) {
    x[i].parentNode.removeChild(x[i]);
  }
}
}

document.addEventListener("click", function (e)
{
    closeAllLists(e.target);
});

/*execute a function presses a key on the keyboard:*/
$('#search').on("keydown", function(e)
{

    var x = document.getElementById("searchautocomplete-list");
    if (x) x = x.getElementsByTagName("div");
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
      increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) { //up
      /*If the arrow UP key is pressed,
      decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
});

function handle_search_submit()
{
    if (window.location.href.includes("item"))
    {
        window.location.href = "/?q=" + $('#search').val() + "#main";
    }
    else
    {
         Searcher.make_query({q: $('#search').val()});
         $('html, body').animate({ scrollTop: $('#split').offset().top-57 }, 1000);
         document.activeElement.blur();
    }
     return false;
}


$(document).ready( function()
{
    $('#main').append( HtmlGen.gen_main_frame_content() )
    document.getElementById('search_form').onsubmit = function(){return handle_search_submit()};
})

async function do_autocomplete()
{
    let response = await Networker.get_hints();
    autocomplete(response.payload.items);
}

$('#search').on('input', function(){
    do_autocomplete();
});

let prevscroll = 0;
if (isMobile())
{
    document.onscroll = function(e) {
        let diff = scrolled() - prevscroll;
        prevscroll = scrolled();
        let height = $(".mynavbar")[0].clientHeight+5;
        let top = parseInt($(".mynavbar").css("top"));
        let newTop;
        if (diff > 0)
        {
            // scroll down
            newTop = Math.max(-height, top - diff) + "px"
        }
        else
        {
            //scroll up
            newTop =  Math.min(0, top - diff) + "px";
        }
        $(".mynavbar").css("top", newTop)
    }
}
