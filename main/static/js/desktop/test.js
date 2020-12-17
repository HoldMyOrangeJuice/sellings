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
const DEF_BLANK_VAL_TEXT = "-";
const DEF_BLANK_VAL_NUM = "???";
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
    constructor()
    {
        this.query = null;
        this.cat = null;
        this.id=null;
        this.part = 0;
        this.max_parts = 1;
        this.items = []
        this.fetch_blocked = false;
        this.disabled = false
    }

    sorts_by_category()
    {
        return this.cat != null;
    }

    make_query({q=null, cat=null, id=null})
    {
        if (this.disabled)return;
        this.items = [];
        $('#search').val(q || CATS[cat] || id);

        this.max_parts = 1;
        if (q != null)
        {
            if (q == "")
                set_url(`/`);
            else
                set_url(`/?q=${q}`);
            this.query = q;
            this.cat = null;
            this.id=null;
            this.part = 0;
        }
        else if (cat != null)
        {
            set_url(`/?cat=${cat}`);
            this.query = null;
            this.id=null;
            this.cat = cat;
            this.part = 0;
        }
        else if (id != null)
        {
            if (!window.location.href.includes("/item/"))
                set_url(`/?id=${id}`);
            this.query = null;
            this.cat = null;
            this.id=id;
            this.part = 0;
        }
        wipe_content();
        this.load_more();
    }

    load_more()
    {

        if (this.fetch_blocked || this.disabled)return;

        if (this.part >= this.max_parts)
        {
            return;
        }
        let searcher = this;
        console.log('lock fetch');
        this.fetch_blocked = true;

        let data = {p: this.part}
        if (this.query != null)
        {
            data.q = this.query
        }
        if (this.cat != null)
        {
            data.cat = this.cat
        }
        if (this.id != null)
        {
            data.id = this.id
        }
        console.log("send", data)

        $.ajax({url:"/api",
                method: "GET",
                data: data,
                success: (r)=>{
                    searcher.fetch_blocked = false;
                    console.log('unlock fetch');
                    if (r.success)
                    {
                        searcher.part += 1;
                        // items = [ [category, [items]], [category, [items]], [category, [items]] ]
                        for (let [category, items] of r.payload.items)
                        {
                            searcher.items.push(...items);
                        }

                        searcher.max_parts = r.payload.parts;

                        if (r.payload.parts == 0)
                        {
                            // empty query for first page
                            $('#empty-query-banner').html(`Ни один предмет не подошел к запросу <br>"${ searcher.query || CATS[searcher.cat] || searcher.id }".<br><a href="#main" onclick='the_searcher.make_query({q: ""})'>Полный список</a>`)
                        }
                        else
                        {
                            $('#empty-query-banner').empty();
                            searcher.display(r.payload.items);
                        }
                    }
                }
            })
    }

    get_item(item_id)
    {
        for (let item of this.items)
        {
            if (item.id == item_id)
            {
                return item;
            }
        }
    }

    display(items)
    {
        add_table_contents(items);
    }
}

the_searcher = new Searcher();


csrf = document.getElementsByName("csrfmiddlewaretoken")[0].value

function set_url(url)
{
    window.history.pushState({"html":"","pageTitle": ""},"", url);
}

function toggle_fav_tab()
{
    if ($('#fav_container').hasClass('fav_opened'))
    {
        close_fav_table();
    }
    else
    {
        $('body').css('position', 'fixed');
        get_fav_items(update_fav_table);
    }
}

function edit_favourite(item_id, subcat_idx)
{

    let elem = $(`[data-item_id='${item_id}'][data-subcat_idx=${subcat_idx}][data-role='cart-action']`);
    let subcat = $(`[data-item_id='${item_id}'][data-subcat_idx=${subcat_idx}]`);
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

    $.ajax({url: '/api',
    data: {'id_to_fav': item_id, 'fav_idx': subcat_idx, 'fav': checked?"1":"0", csrfmiddlewaretoken: csrf },
    method: 'POST'})
}

function wipe_content()
{
    console.log("wipe html");
    $('#table-container').empty();
}

function add_item()
    {
        let form_data = new FormData($("#add_item_form")[0])
        let xhr = new XMLHttpRequest();


        xhr.open( 'POST', 'api', true );
        xhr.onreadystatechange = ()=>{
       if (xhr.readyState==4 && xhr.status==200)
       {

          var data = xhr.responseText;
          if (data == "success")
          {
            reset_form();
          }
          else if (data == "invalid form")
          {
            alert("Не все поля заполнены.")
          }

       }
    }
        xhr.send( form_data );
    }


    function search_query(query)
    {
    $.ajax({
      url:"api",
      method: "GET",
      data: {"query": query },
      success:
      (data)=>
      {
      add_table_contents(data);
      }
    });

    }


function toggle_contacts()
{
    if ( $('.static-contacts > .static-bottom-entry').hasClass("focuded-contacts") )
    {
        collapse_contacts();
        return;
    }
    stretch_contacts();
}

function stretch_contacts()
{
    $('.static-contacts').css('height', '300px');
    $('.static-contacts > .static-bottom-entry').addClass("focuded-contacts")
}

function collapse_contacts()
{
    $('.static-contacts').css('height', '45px');
    $('.static-contacts > .static-bottom-entry').removeClass("focuded-contacts")
}

document.addEventListener('scroll', collapse_contacts);

function unsaved_check()
{
    if ( $(".unsaved").length == 0)
    {
        $("#not_saved_alert").hide();
    }
}

function unsaved_alert(elem, not_saved)
{
    if (not_saved)
    {
        $("#not_saved_alert").show();
        $(elem).addClass('unsaved');
        return;
    }
    $(elem).removeClass('unsaved');
    unsaved_check();
}


function update_photo_delete_function(item_id)
{
    let del_btn = $(`button[data-item_id=${item_id}][data-role='delete_images']`)
    let selected_photos = $(`img.selected[data-item_id='${item_id}']`)
    if (selected_photos.length == 0)
    {
        del_btn.hide()
    }
    else
    {
        del_btn.text(`Удалить ${selected_photos.length} фото`)
        del_btn.show()
    }
}

function handle_image_click(clicked)
{
    let link = $(clicked).data('path')
    let parent = $(clicked).parent();
    // parent contains all image objects
    if (ADMIN)
    {
        if ($("#" + link).hasClass("selected"))
        {
            $("#" + link).removeClass("selected");
        }
        else
        {
            $("#" + link).addClass("selected");
        }
        update_photo_delete_function( $("#" + link).data('item_id') );
    }
    else
    {
        console.log("show image")
        $(".blur").show()
        open_photo_view_window(clicked, parent);
    }

}



function open_order_form(item_id)
{
    let item = the_searcher.get_item(item_id) || the_item;
    $('#item-data').html(`<span>${item.name}</span> <span>${item.condition}</span>`)
    $('#orderModal').modal('toggle');
    $('#order_form_item_id').val(item_id);
}
function submit_order()
{
    let myform = $('#orderModal').find('form')[0];
    if (!myform.checkValidity())
    {
        if (myform.reportValidity)
        {
            myform.reportValidity();
        }
        return;
    }
    $.ajax({method: 'GET', url: '/api', data:$('#orderModal').find('form').serialize() })
    $('#orderModal').modal('toggle');

}

function gen_order_button(item_id)
{
    return `<button class='btn btn-warning' onclick='open_order_form(item_id)'>Заказать</button>`;
}

function gen_image_viewer(active_path, images)
{
    let image_icons = ''
    for (let image of images)
    {
        image_icons += `<div style='background-image: url(/static/images/items/${image})' class='img-icon ${active_path==image?'active': ""}'></div>`
    }

    return `<div id='image_viewer'>
                <div id='close_viewer_icon'>
                    <i style='font-size: 20px;' class="fas fa-window-close" onclick="$('#image_viewer').remove(); $('.blur').hide();"></i>
                </div>
                <img id='image_main' src='/static/images/items/${active_path}'>
                <div id='viewer_controls'>
                    <button id='viewer_prev' class='btn btn-warning'><i class="fas fa-angle-left"></i></button>
                    <button id='viewer_next' class='btn btn-warning'><i class="fas fa-angle-right"></i></button>
                </div>

                <div id='image_icons'>
                    ${image_icons}
                <div>
            </div>`
}

photos = []
let current = null;
function open_photo_view_window(elem_clicked, parent)
{
    photos = []
    let current = null;
    // each element of parent has tags role=image_icon and path.
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
    $('body').append( gen_image_viewer(photos[current], photos) );

    const show = (i) =>
    {
        $('#image_viewer').find('.active').removeClass('active');
        $( $('#image_viewer').find('#image_icons').children().get(i) ).addClass('active');
        $('#image_main').attr('src', `/static/images/items/${photos[i]}`);
    }

    const hide = () =>
    {
        $('#image_viewer').remove();
        $(".blur").hide();
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
        console.log('prev')
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


function delete_item(id)
{
    $.ajax({
      url:"api",
      method: "POST",
      data: {"id_to_del": id, q: $('#search').val(), csrfmiddlewaretoken: csrf },
      success:
      (data)=>
      {
          // todo
          console.log(data.message);
      }
    });
}

function update_item(item_id)
{
    // everything except photo done here
    let formData = new FormData();
    for (let field of ["name", "condition", "description", "category"])
    {
        formData.append(field, $("#" + "edit_" + field +"_"+ item_id).val());
    }
    subcats = serialize_subcats(item_id);
    formData.append("id_to_edit", item_id);
    formData.append("subcats", JSON.stringify(subcats) );

    formData.append("csrfmiddlewaretoken", csrf);
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = ()=>
    {
        if (xhr.readyState==4 && xhr.status==200)
        {
            let data = JSON.parse(xhr.responseText);
            if (data.success)
            {
                // remove unsaved background
                $(`tr[data-item_id='${item_id}'][data-role='main_item_data']`).find('.unsaved').removeClass('unsaved')
                unsaved_check();
                // hide save button
                $(`button[data-item_id=${item_id}][data-role='confirm_main_data_edit']`).hide();
            }
        }
    }
    xhr.open( 'POST', 'api', true );
    xhr.send( formData );
}

function save_all_unsaved()
{
    for ( let e of $('.unsaved') )
    {
        let item_id = $(e).children().data('item_id');
        let role = $(e).children().data('role')

        if (role == 'illustration')
        {
            console.log('save image')
            // save image
            save_images(item_id);
        }
        else
        {
            console.log('save text')
            // save main data
            update_item(item_id);
        }
    }
}

function hide_overlay()
{
 $(".blur").addClass("hidden")
$(".overlay").addClass("hidden")
}


function request_photos_upload(item_id)
{
    let form_data = new FormData($("#add_item_form")[0])
    let xhr = new XMLHttpRequest();


    xhr.open( 'POST', 'api', true );
    xhr.onreadystatechange = ()=>{
   if (xhr.readyState==4 && xhr.status==200)
   {
      var data = JSON.parse(xhr.responseText);
      if (data.success)
      {
          for (let filename of data.payload.filenames)
          {
              append_photo(item_id, filenames);
          }
      }
      else if (data == "invalid form")
      {
        alert("Не все поля заполнены.")
      }

   }
}
    xhr.send( form_data );
}


function get_fav_items(callback)
{
    $.ajax({method: "GET", url: "/api", data: {"get-favs": "1"}, success: e=>
    {
        if (e.success)
        {
            callback(e.payload.items);
        }
    }
})
}
function close_fav_table(){
    $(`#fav_container`).removeClass('fav_opened');
    $(`#fav_container`).css("height", 0)
    $('body').css('position', 'relative');
}

function update_fav_table(fav_items)
{

    $(`#fav_container`).empty();
    $(`#fav_container`).css("height", Math.max($('#split').offset().top-57, 500) + "px")
    $(`#fav_container`).addClass('fav_opened')

    if (fav_items.length == 0)
    {
        $(`#fav_container`).append(`<p style='text-align: center; color: white;'>
                                        Пока что тут ничего нет. <br
                                        >Надо чета сделать и я не знаю,<br>
                                        как об этом написать
                                    </p>
                                    <div onclick='close_fav_table()'
                                         id='collapse_fav_tab'>
                                         <i class="fas fa-angle-up"></i>
                                    </div>`);
        return;
    }

    $(`#fav_container`).append(`<div id='fav-tabs-cont'></div>

                               <div onclick='close_fav_table()'
                                    id='collapse_fav_tab'>
                                 <i class="fas fa-angle-up"></i>
                              </div>`)
    for (let item of fav_items)
    {
        $(`#fav-tabs-cont`).append(`<table class="table table-bordered"><tr>
                                            <td class=''>
                                                ${item.name}
                                            </td>
                                            <td>
                                                ${item.description || DEF_BLANK_VAL_TEXT}
                                            </td>
                                            <td>
                                                ${item.condition || DEF_BLANK_VAL_TEXT}
                                            </td>
                                            <td><table>
                                                ${gen_subcat_general(item.id, item.subcat_id, item.param, item.price, item.amount, true)}
                                            </table></td></tr>
                                            <tr>
                                            <td colspan='2'>
                                                <button class='btn btn-warning btn-block' onclick="open_order_form(${item.id})">Заказать</button>
                                            </td>
                                            <td colspan='2'>
                                                <button class='btn btn-warning btn-block nowrap'
                                                onclick="open_in_new_window('/item/${item.id}')">
                                                Открыть в новой вкладке</button>
                                            </td>
                                        </tr></table>`)
    }
}
function open_in_new_window(path)
{
    window.open(path);
}

function request_photos_delete(item_id)
{
    let selected_photos = $(`img.selected[data-item_id='${item_id}']`)
    let filenames = []
    for (let elem of selected_photos)
    {
        filenames.push(elem.id);
    }

    $.ajax(
        {
            method: "POST",
            data: {item_id: item_id,
                   filenames_to_delete: JSON.stringify(filenames),
                   csrfmiddlewaretoken: csrf},
            url: "/api",
            success: (r)=>
            {
                let resposnse = JSON.parse(r);
                if (resposnse.success)
                {
                    selected_photos.remove();
                    $(`button[data-item_id='${item_id}'][data-role='delete_images']`).hide();
                }
            }
        });
}

function serialize_subcats(item_id)
{
    data = []

    for (let i=0; i < $(`textarea[data-item_id='${item_id}'][data-role='param']`).length; i++)
    {
        let eparam = $(`textarea[data-item_id='${item_id}'][data-role='param']`)[i]
        let eprice = $(`input[data-item_id='${item_id}'][data-role='price']`)[i]
        let eamount = $(`input[data-item_id='${item_id}'][data-role='amount']`)[i]

        data.push({param: $(eparam).val(), price: $(eprice).val(), amount: $(eamount).val()})
    }
    return data;
}

function save_images(item_id)
{
    let preview_elems = $(`img.temp_image[data-item_id=${item_id}]`);
    let files = $(`input[data-item_id='${item_id}'][data-role='add_files_input']`)[0].files
    if (files.length == 0)
    {
        alert('0 files selected');
        return;
    }

    let formData = new FormData( $(`form[data-item_id='${item_id}'][data-role='add_files_form']`)[0] );
    formData.append("item_id_add_photo_for", item_id);
    formData.append("csrfmiddlewaretoken", csrf);

    let xhr = new XMLHttpRequest();
    xhr.open( 'POST', 'api', true );
    xhr.onreadystatechange = ()=>
    {
        if (xhr.readyState==4 && xhr.status==200)
        {
            let data = JSON.parse(xhr.responseText);
            if (data.success)
            {
                // remove temp photos and
                // add new with static link
                preview_elems.remove()
                let bulk_elem = $(`div[data-item_id='${item_id}'][data-role='image_bulk']`)[0];
                unsaved_alert(bulk_elem, false);
                console.log(data, data.payload.filenames);
                for (let filename of data.payload.filenames)
                {
                    append_photo(item_id, filename, false);
                }
                // remove upload button
                $(`button[data-item_id='${item_id}'][data-role='confirm_photo_addition']`).remove();
                // remove cancel button
                $(`button[data-item_id='${item_id}'][data-role='cancel_photo_addition']`).remove();
                // remove files from imput
                reset($(`input[data-item_id=${item_id}][data-role='add_files_input']`))
            }
            else
            {
                alert('something went wrong with file upload');
            }
        }
    }
    xhr.send( formData );
}


function gen_select(cat)
{
    let select = ''
    for (category of Object.values(CATS))
    {
    if (category === cat)
        select +="<option selected='selected'>" + category + "</option>"
    else
        select +="<option>" + category + "</option>"
    }
    return select
}

function cancel_addition_of_photos(item_id)
{
    // remove temp images
    $(`img.temp_image[data-item_id='${item_id}']`).remove();
    // remove 'unsaved' class from image container
    $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).removeClass("unsaved")
    // check if page still has unsaved content
    unsaved_check();
    // remove control buttons
    $(`button[data-item_id=${item_id}][data-role='cancel_photo_addition']`).remove();
    $(`button[data-item_id=${item_id}][data-role='confirm_photo_addition']`).remove();
    // reset file form
    reset($(`input[data-item_id=${item_id}][data-role='add_files_input']`))

}

function delete_subcat(item_id, subcat_id)
{

    $(`tr[data-subcat_idx='${subcat_id}'][data-item_id='${item_id}']`).remove();
}

function gen_subcat_general(item_id, subcat_id, param, price, amount, fav, unsaved)
{
    console.log("gen subcat", item_id, subcat_id);
    subcat_html = `
    <tr data-subcat_idx='${subcat_id}' data-item_id='${item_id}' class="${fav?'fav':''}">
        <td>
            ${ADMIN?`
                <textarea
                    rows='1'
                    style='overflow:hidden'
                    class='edit-form auto-adjust input-text text-form-trackable ${(ADMIN&&unsaved)?'unsaved':''}'
                    data-item_id='${item_id}'
                    data-role='param'
                    class='edit-form'>
                        ${param}
                </textarea>`
                : param || DEF_BLANK_VAL_TEXT}
        </td>

        <td>
            <span class='nowrap'>
                ${ADMIN?`<input
                                data-item_id='${item_id}'
                                data-role='price'
                                class='edit-form input-int text-form-trackable ${(ADMIN&&unsaved)?'unsaved':''}'
                                value=${price}>`
                :price || DEF_BLANK_VAL_NUM} грн.
            </span>
        </td>

        <td class=''>
            <span class='nowrap'>
                    ${ADMIN?`<input
                            data-item_id='${item_id}'
                            data-role='amount'
                            class='edit-form input-int text-form-trackable ${(ADMIN&&unsaved)?'unsaved':''}'
                            value='${amount}'>`
                    :amount || DEF_BLANK_VAL_NUM} шт.
            </span>
        </td>

        ${ADMIN?
        `<td>
            <button class='btn btn-danger'
            onclick='delete_subcat("${item_id}", "${subcat_id}")'>${LANG.delete}</button>
        </td>`:
        `<td>
            <!-- Three dots menu -->
            <div style='display: inline-block' class="dropdown three-dots">
              <button class="three-dots-btn" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i class="fas fa-ellipsis-v" style='font-size: 15px;'></i>
              </button>
              <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
                <div class="dropdown-item"
                     data-item_id='${item_id}'
                     data-subcat_idx=${subcat_id}
                     data-role='cart-action'
                     data-checked='${fav}'
                     onclick='edit_favourite(${item_id}, ${subcat_id})'>
                    ${fav?
                        '<span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>':
                        '<span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>'}
                </div>
                <div class="dropdown-item" onclick='open_order_form(${item_id})'>
                    <span>Заказать</span><i style='margin-left: 5px; color: gray' class="fas fa-money-check"></i>
                </div>
              </div>
            </div>
            <!-- /Three dots menu -->
        </td>`
    }

    </tr>`
    return subcat_html;
}

function gen_subcat(subcat, item_id, subcat_idx, unsaved)
{
    if (subcat_idx instanceof Function) {
    subcat_idx = subcat_idx(item_id);
    }
    return gen_subcat_general(item_id, subcat_idx, subcat.param, subcat.price, subcat.amount, subcat.fav, unsaved);
}

function add_subcat_to(subcat_html, item_id)
{
    $(`table[data-subcat_table=${item_id}]`).find('tbody').append(subcat_html)
    track_text_changes();
}

function gen_subcats_table(subcats, item_id)
{
    let html = ""
        for (let [idx, subcat] of subcats.entries())
        {
            html += gen_subcat(subcat, item_id, idx);
        }
    return html;
}

// append fhoto to existing bulk
function append_photo(item_id, filename, temp)
{
    if (temp)
    {
        unsaved_alert($(`div[data-item_id='${item_id}'][data-role='image_bulk']`)[0], true);

        // add cancel button
        $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).parent().append
        (`<button data-item_id=${item_id}
                  class='btn btn-danger'
                  style='margin: 10px 5px 0 0'
                  data-role='cancel_photo_addition'
                  onclick='cancel_addition_of_photos(${item_id})'>
                  ${LANG.cancel}
          </button>`)
    }

    $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).append
    (gen_photo_image_html(item_id, filename, temp))
}


function gen_photo_image_html(item_id, file, temp)
{
    let uniqueid = uuid();
    // file arg is serverside filename or instance of File if temp=True
    if (temp)
    {
        let reader  = new FileReader();
        reader.onloadend = () => {
            $(`img[data-item_id='${item_id}'][data-uuid-promise='${uniqueid}']`).attr("src", reader.result).removeAttr('data-uuid-promise');
        }
        reader.readAsDataURL(file);
    }

    return `<img src='${temp?"/static/images/placeholder":`/static/images/items/${file}`}'
              class='image ${temp?'temp_image': ''}' ${temp?"":`id='${file}'`}
              data-item_id='${item_id}'
              data-role='illustration'
              ${temp?`data-uuid-promise='${uniqueid}'`:""}
              ${temp?"":`onclick=handle_image_click(this)`}>`
}

// fill photo bulk section in table
function gen_image_bulk(paths, item_id)
{
    if (ADMIN)
        return gen_admin_image_bulk(paths, item_id);
    return gen_user_image_bulk (paths, item_id);
}

function gen_admin_image_bulk(paths, item_id)
{
    let html = `<div data-item_id='${item_id}' data-role='image_bulk' class='image_bulk'>`;
    for (let path of paths)
    {
        html += gen_photo_image_html(item_id, path);
    }
    html += "</div>";
    html += `
            <button class='btn btn-danger'
                    data-item_id='${item_id}'
                    data-role='delete_images'
                    style='display:none'
                    onclick='request_photos_delete(${item_id})'>
            </button>`
    return html;
}
function fill_user_image_bulk(item_id, vert_images_, hor_images_)
{
    let vert_images = [...vert_images_];
    let hor_images = [...hor_images_];
    console.log("fill", item_id, " with", [...vert_images], [...hor_images])
    let big_side = 1024;
    let small_side = 678;
    let scale_big = 5;
    let scale_small = 10;
    let images = [];
    // need to implement that format \/
    //gen_photo_image_html(item_id, path);
    const add_hor_image = scale => {
        console.log()
        let src = "/static/images/items/" + hor_images.shift();
                                      images.push(`<img class='nice_image'
                                                   src='${src}'
                                                   data-role='image_icon'
                                                   data-path='${src}'
                                                   style='grid-column: 1 / span ${scale||1}; grid-row: 1 '>`);
                                      }

   const add_vert_image = scale => { let src = "/static/images/items/" + vert_images.shift();
                                    images.push(`<img class='nice_image'
                                                      src='${src}'
                                                      data-role='image_icon'
                                                      data-path='${src}'
                                                      style='grid-column: 1 / span ${scale*2||1}; grid-row: 1 / span ${scale*3||1}'>`);
                                    }
    const add_image = path => {let src = "/static/images/items/" + path;
                                     images.push(`<div  class='nice_image sq'
                                                        style="background-image: url('${src}'); background-size: cover; background-position: center;"
                                                        data-role='image_icon'
                                                        data-path='${src}'>
                                                 </div>`)}

    if (vert_images.length != 0)
        add_vert_image(1);
    else if (hor_images.length != 0)
        add_hor_image(1);
    for (let image of vert_images)
        add_image(image);
    for (let image of hor_images)
        add_image(image);

    let bulk_div_to_fill = $(`div[data-item_id='${item_id}'][data-role='image_bulk']`)


    if (vert_images_.length + hor_images_.length < 2)
        if (vert_images.length != 0)
            bulk_div_to_fill.addClass('single-ver')
        else
            bulk_div_to_fill.addClass('single-hor')

    else if (vert_images_.length + hor_images_.length < 7)
        bulk_div_to_fill.addClass('middle')
    else
        bulk_div_to_fill.addClass('many')


    for (let i of images)
    {
        bulk_div_to_fill.append(i);
    }
}

function gen_user_image_bulk(paths, item_id)
{
    // bulk wrapper
    let html = `<div data-item_id='${item_id}' data-role='image_bulk' class='image_bulk'>`;

    for (let [i, path] of paths.entries())
    {

        html += `<div class='${i == 0?'bulk_main':'bulk_item'}'
                      data-role='image_icon'
                      data-path='${path}'
                      onclick='handle_image_click(this)'
                      style='background-image: url("/static/images/items/${path}");'></div>`
    }
    html += "</div>";

    return html;
}
function get_max_subcats(item_id)
{
    return $(`[data-subcat_table='${item_id}'] > tbody`).children().length
}

function gen_admin_table_rows(item)
{
    return `
        <tr data-item_id='${item.id}' data-role='main_item_data'>
            <td>
                <textarea rows='1' id='edit_name_"${item.id}' style='overflow:hidden' class='edit-form input-text text-form-trackable'>${item.name}</textarea>
            </td>
            <td colspan=0>
                <table data-subcat_table='${item.id}' style='width: 100%'>
                    <thead>
                        <tr>
                            <th>Характеристика</th>
                            <th>Цена</th>
                            <th>Количество</th>
                            <th>Delete</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${gen_subcats_table(item.subcats, item.id)}
                    </tbody>
                </table>

                    <button class='btn btn-success btn-lg btn-block'
                               style='margin-top: 10px'
                               onclick='add_subcat_to(gen_subcat( {param: "", price: 0, amount: 0}, ${item.id}, get_max_subcats, true), ${item.id} )'>
                               ${LANG.add}
                       </button>
            </td>

            <td>
                <select id='edit_category_${item.id}' name='category' class='form-control mr-sm-2 text-form-trackable'> ${gen_select(item.category)} "</select>"
            </td>
            <td>
                <textarea rows='1' id='edit_description_${item.id}' onkeyup='textAreaAdjust(this)' style='overflow:hidden' class='edit-form input-text text-form-trackable'>${item.description}</textarea>
            </td>
            <td>
                <textarea rows='1' id='edit_condition_${item.id}' onkeyup='textAreaAdjust(this)' style='overflow:hidden' class='edit-form input-text text-form-trackable'>${item.condition}</textarea>
            </td>

           <td>
                <button class='btn btn-danger' onclick=delete_item('${item.id}')>${LANG.delete}</button>
                <hr>
                <button class='btn btn-warning'
                        style='display:none'
                        data-item_id='${item.id}'
                        data-role='confirm_main_data_edit'
                        onclick=update_item('${item.id}')>${LANG.save}
                </button>
            </td>

        </tr>

        <tr data-item_id='${item.id}' data-role='photo_item_data'>
            <td colspan='7'>
            ${gen_image_bulk(item.photo_paths, item.id)}


                <hr>
                <label for='${"edit-file-"+item.id}' class='btn btn-success'>
                    ${LANG.add}
                </label>
                <form data-item_id='${item.id}' data-role='add_files_form'>
                    <input type='file'
                           data-item_id='${item.id}'
                           data-role='add_files_input'
                           multiple='multiple'
                           class='hidden'
                           name='photo'
                           id='${"edit-file-"+item.id}'>
                </form>

            </td>
        </tr>`
}

function gen_checkbox(item)
{
    return `<input data-item_id=${item.id} type='checkbox' ${item.fav?"checked='checked'": ""} oninput='edit_favourite(${item.id}, this)'>`
}

function gen_user_table_rows(item)
{
    return `
        <tr data-item_id='${item.id}' data-role='main_item_data'>

            <td style='max-width: 20vw'>
                <div class='' style='position: relative; display: flex; align-items: flex-end'>
                    <p style='display: inline-block; margin: 0;'><a style='font-size: 20px;' class='' href="/item/${item.id}" onclick='window.open("/item/${item.id}")'>${item.name}</a></p>
                </div>
            </td>

            <td colspan>
                <table data-subcat_table='${item.id}' style='width: 100%'>
                    <thead style='display: none'>
                        <tr>
                            <th>Характеристика</th>
                            <th>Цена</th>
                            <th>Количество</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${gen_subcats_table(item.subcats, item.id)}
                    </tbody>
                </table>
            </td>

            <td style='max-width: 200px; min-width: 150px;'>
                ${item.description || DEF_BLANK_VAL_TEXT}
            </td>

            <td>
                ${item.condition || DEF_BLANK_VAL_TEXT}
            </td>

            <td>
            ${gen_image_bulk(item.photo_paths, item.id)}
            </td>
        </tr>`
}

function gen_table_rows(item)
{
    if (ADMIN)
    {
        return gen_admin_table_rows(item);
    }
    return gen_user_table_rows(item);
}

function gen_cat_table(category) {

    return `<p class="chapter" id="${category}">${category}</p>
    <table class="table table-bordered category_table" data-tcategory='${category}'>

        <thead class='thead-dark'>
          <tr>
                <th scope="col">Название</th>
                <th scope="col" colspan=''> Подкатегории </th>

                ${ADMIN?'<th scope="col">Категория</th>':''}
                <th scope="col">Описание</th>
                <th scope="col">Состояние</th>
                ${ADMIN?"":`<th>Фотографии</th>`}

              ${ADMIN?`<th>${LANG.actions}</th>`:""}
          </tr>
      <thead>

      <tbody>
            <!-- table body -->
     </tbody>
</table>`

}

// useless?
function set_table_contents(data)
{
    $("#table-container").html(gen_table_contents(data))
    handle_image_load_events();
    listen_to_adjusts();
    track_text_changes();
}

function add_table_contents(data)
{
    for (let [category, items] of data)
    {
        for (let item of items)
        {
            if ( $(`#table-container table[data-tcategory='${category}']`).length == 0 )
            {
                $(`#table-container`).append(`${gen_cat_table(category)}`)
            }
            $(`#table-container table[data-tcategory='${category}'] > tbody`).append(gen_table_rows(item))
        }
    }

    handle_image_load_events();
    listen_to_adjusts();
    track_text_changes();
}

function reset_form()
{
    $("#image_label").text("")
    $("#description").val("")
    $("#condition").val("")
    $("#target").removeAttr("src");
    $("#name").val("")
    $("#price").val("")
    $("#amount").val("")

}

function previewImage(source, target)
{
    photos = []
    for (let file of source.files)
    {
        console.log(file)
        let reader = new FileReader();
        reader.onloadend = function ()
        {
            photos.push(reader.result);
            if (photos.length == source.files.length)
            {
                html = ""
                for (let base64 of photos)
                {
                    html+= `<img src=${base64}>`
                }

                $(target).html(
                    `${html}`
                )
            }
        }
        if (file)
        {
            reader.readAsDataURL(file);
        }
    }
}

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
           the_searcher.load_more();
        }
   });
});

function handle_image_load_events()
{
    for (let i of $("input[data-role='add_files_input']") )
    {
        i.onchange = () =>
        {
            console.log("files loaded", i.files)
            let item_id = $(i).data('item_id');
            for (let file of i.files)
            {
                append_photo(item_id, file, true)
            }
            // not on load of all files :(
            $(`div[data-item_id='${item_id}'][data-role='image_bulk']`).parent().append
            (`<button class='btn btn-warning'
                      data-role='confirm_photo_addition'
                      data-item_id='${item_id}'
                      style='margin-top: 10px'
                      onclick='save_images(${item_id})'>${LANG.save} ${i.files.length} фото
              </button>`)
        };
    }
}

function track_text_changes()
{
    $('.text-form-trackable').on("input", (e)=>{
        unsaved_alert($(e.target).parent()[0], true)
        let item_id = $(e.target).data('item_id');
        $(`button[data-item_id=${item_id}][data-role='confirm_main_data_edit']`).show()
    })
}

function textAreaAdjust(element)
{
  element.style.height = "1px";
  element.style.height = (element.scrollHeight)+"px";
}

function query(q)
{
    the_searcher.make_query({q: q});
}
function query_cat(c)
{
    the_searcher.make_query({cat: c});
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
document.addEventListener("click", function (e) {
    closeAllLists(e.target);
});
