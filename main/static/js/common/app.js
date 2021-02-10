// mobile
zip = rows=>rows[0].map((_,c)=>rows.map(row=>row[c]))
function reset(e)
{
  e.wrap('<form>').closest('form').get(0).reset();
  e.unwrap();
}
uuid = ()=>
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};



const DEF_BLANK_VAL_TEXT = "-";
const DEF_BLANK_VAL_NUM = "?";
const SCREENS_TILL_FETCH = 3;
const LANG = {
    edit: "Редактировать",
    add: "Добавить",
    delete: "Удалить",
    save: "Сохранить",
    actions: 'Действия',
    cancel: 'Отмена'
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
        return this.cat != null;
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
            this.cat = null;
            this.id=null;
            this.part = 0;
        }
        else if (cat != null)
        {
            PageActions.set_url(`/?cat=${cat}`);
            this.query = null;
            this.id=null;
            this.cat = cat;
            this.part = 0;
        }
        else if (id != null)
        {
            if (!window.location.href.includes("/item"))
                PageActions.set_url(`/?id=${id}`);
            this.query = null;
            this.cat = null;
            this.id=id;
            this.part = 0;
        }
        Renderer.wipe_content();
        this.load_more();
    }

    static async load_more()
    {

        if (this.fetch_blocked || this.part >= this.max_parts)return;

        this.fetch_blocked = true;

        let data = {p: this.part}
        if (this.query!=null)
        data.q = this.query
        if (this.cat!=null)
        data.cat = this.cat
        if (this.id!=null)
        data.id = this.id


        let [categorized_items, parts] = await Networker.get_items(data);
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
            DOMManager.get_empty_query_banner().empty();
            Renderer.add_to_table(categorized_items);
        }
    }

    static get_item(item_id)
    {
        for (let item of this.items)
        {
            if (item.id == item_id)
            {
                return item;
            }
        }
    }
}
class NetworkerBase
{
    static async makeRequest(method, url, data)
    {
        if (method == 'GET')
        {
            console.log(data)
            let ser = typeof data == 'string'? data : jQuery.param( data )
            return await fetch(`${url}?${ser}`, {
                method: method,
            });
        }
        else
        {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open(method, url);
                xhr.onload = function () {
                  if (this.status >= 200 && this.status < 300) {
                    resolve( JSON.parse(xhr.response) );
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

    static async POST(data)
    {
        console.log(data);
        if (! (data instanceof FormData) )
        {
            console.log("to fdata");
            let fd = new FormData();
            for ( let key of Object.keys(data) )
            {
                fd.append(key, data[key]);
            }
            data = fd;
        }
        data.append('csrfmiddlewaretoken', document.getElementsByName("csrfmiddlewaretoken")[0].value);

        let resp = await this.makeRequest('POST', '/api', data);
        return resp;
    }

    static async GET(data)
    {
        let resp = await this.makeRequest('GET', '/api', data);
        return await resp.json();
    }
}

class Networker extends NetworkerBase
{
    static async fetch({id=null,
                        ids=null,
                        query=null,
                        category=null,
                        max_data=0})
    {
        // same as make query but returns max_data entries
        // and does not change searcher state
        let response = await this.GET({id: id, ids:ids, query:query, category:category, max_data:max_data});
        if (response.success)
        {
            return response.payload.items;
        }
    }

    static async get_items(query_data_obj)
    {
        let data = await this.GET(query_data_obj);
        return [data.payload.items, data.payload.parts];
    }

    static async set_fav_state(item_id, subcat_idx, checked)
    {
        return await this.POST( {'id_to_fav': item_id, 'fav_idx': subcat_idx, 'fav': checked?"1":"0"} )
    }

    static async submit_order()
    {
        Networker.GET( $('#orderModal').find('form').serialize() );
    }

    static async get_fav_items()
    {
        let data = await this.GET({"get-favs": "1"});
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
    static lock_scroll(jq)
    {
        sc = $(document).scrollTop();
        jq.css('position', 'fixed');
    }

    static unlock_scroll(jq)
    {
        jq.css('position', 'relative');
        $(document).scrollTop(sc)
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

// this class defines all page content changing actions
class Renderer
{
    static wipe_content()
    {
        DOMManager.get_table_container().empty();
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
        listen_to_adjusts();
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
        $('.static-contacts').css('height', '300px');
        $('.static-contacts > .static-bottom-entry').addClass("focuded-contacts")
    }

    static collapse_contacts()
    {
        $('.static-contacts').css('height', '45px');
        $('.static-contacts > .static-bottom-entry').removeClass("focuded-contacts")
    }

    static open_order_form(item_id)
    {
        let item = Searcher.get_item(item_id)

        if (!item)
        {
            item = Searcher.fetch({id: item_id})[0];
        }

        $('#item-data').html(`<span>${item.name}</span> <span>${item.condition}</span>`)
        $('#orderModal').modal('toggle');
        $('#order_form_item_id').val(item_id);
    }

    static show_fav_table(fav_items)
    {

        $(`#fav_container`).empty();
        $(`#fav_container`).css("height", 'calc(100vh - 128px)')
        $(`#fav_container`).addClass('fav_opened')

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
        $('body').append( HtmlGen.gen_image_viewer(photos[current], photos) );
        //lock_scroll($('body'));
        PageActions.lock_scroll($(window));
        listen_to_swaps($('#image_viewer'), (dir)=>{if (dir == "<-")prev();else next();})


        const show = (i) =>
        {
            $('#image_viewer').find('.active').removeClass('active');
            $($('#image_viewer').find('#image_icons').children().get(i)).addClass('active');
            $('#image_main').attr('src', `/static/images/items/${photos[i]}`);
        }



        $('body').on('keydown', e=>{if (e.key == 'Escape'){hide();}})
        $('.img-icon').on('click', e=>{show($(e.target).index())})
        $('#image_viewer').on('click', e=>{if (e.target.id == 'image_viewer'){hide()}})

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

    static hide_overlay()
    {
        $(".blur").addClass("hidden")
        $(".overlay").addClass("hidden")
    }

    static close_fav_table()
    {
        $(`#fav_container`).removeClass('fav_opened');
        $(`#fav_container`).css("height", 0)
        $('body').css('position', 'relative')
    }

    static async toggle_fav_tab()
    {
        if ($('#fav_container').hasClass('fav_opened'))
        {
            Renderer.close_fav_table();
        }
        else
        {
            $('body').css('position', 'fixed')
            let items = await Networker.get_fav_items();
            Renderer.show_fav_table(items)
        }
    }
}


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
        $(".blur").show()
        Renderer.open_photo_view_window(clicked, parent);
    }
}

function submit_order()
{
    let myform = $('#orderModal').find('form')[0];
    if (!myform.checkValidity())
    {
        if (myform.reportValidity)
            myform.reportValidity();
        return;
    }
    Networker.submit_order();
    $('#orderModal').modal('toggle');
}

photos = []
let current = null;
function hide()
{
    $('#image_viewer').remove();
    $(".blur").hide();
    //unlock_scroll($('body'));
    enableScroll(window);
}

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

function textAreaAdjust(element)
{
  element.style.height = "1px";
  element.style.height = (element.scrollHeight)+"px";
}

function query(q)
{
    Searcher.make_query({q: q});
}

function query_cat(c)
{
    Searcher.make_query({cat: c});
}


// autocomplete
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
          handle_search_btn();
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
document.addEventListener('scroll', Renderer.collapse_contacts);

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

function handle_search_btn()
{
     Searcher.make_query({q: $('#search').val()});
     document.activeElement.blur();
     return false;
}

$(document).ready( ()=>
{
    $('#main').append( HtmlGen.gen_main_frame_content() )
    document.getElementById('search_form').onsubmit = e => {return handle_search_btn()};
})

$('#search').on('input', ()=>
{
    $.ajax({method: "GET", url: '/api', data: {"pq": $('#search').val()}, success: (r)=>
        {
            if (r.success)
            {
                console.log(r.payload.sug);
                autocomplete(r.payload.sug);
            }
        }
    })
});
