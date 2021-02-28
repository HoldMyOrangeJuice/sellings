let dark = false;
class HtmlGen
{

    static gen_image_viewer(active_path, images)
    {
        let image_icons = ''

        for (let image of images)
        {
            image_icons += `<div style='background-image: url("/static/images/items/${image}")' class='bulk_item img-icon ${active_path==image?'active': ""}'></div>`
        }

        return `<div id='image_viewer'>

                    <!-- close btn -->
                    <div id='close_viewer_icon'>
                        <i style='font-size: 20px;' class="fas fa-window-close" onclick="hide()"></i>
                    </div>

                    <!-- img main -->
                    <img id='image_main' src='/static/images/items/${active_path}'>

                    <!-- controls -->
                    <div class='viewer_controls flex'>

                        <!-- <- buttons -> -->
                        <div id='viewer_buttons'>
                            <button id='viewer_prev' class='btn btn-warning'><i class="fas fa-angle-left"></i></button>
                            <button id='viewer_next' class='btn btn-warning'><i class="fas fa-angle-right"></i></button>
                        </div>

                        <!-- icons -->
                        <div id='image_icons'>
                            ${image_icons}
                        <div>
                    </div>

                </div>`
    }

    static gen_select(cat)
    {
        let select = ''
        for (let category of Object.values(CATS))
        {
        if (category === cat)
            select +="<option selected='selected'>" + category + "</option>"
        else
            select +="<option>" + category + "</option>"
        }
        return select
    }

    static gen_three_dots(item_id, subcat_id, fav)
    {
        return `<!-- Three dots menu -->
        <div style='display: inline-block' class="dropdown three-dots">
          <button class="three-dots-btn" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i class="fas fa-ellipsis-v" style='font-size: 15px;'></i>
          </button>
          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <div class="dropdown-item" data-item_id='${item_id}' data-subcat_idx=${subcat_id} data-role='cart-action' data-checked='${fav}' onclick='edit_favourite(${item_id}, ${subcat_id})'>
                ${fav?
                    '<span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>':
                    '<span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>'}
            </div>
            <div class="dropdown-item" onclick='Renderer.open_order_form(${item_id}, ${subcat_id})'>
                <span>Заказать</span><i style='margin-left: 5px; color: gray' class="fas fa-money-check"></i>
            </div>
          </div>
        </div>
        <!-- /Three dots menu -->`;
    }

    static gen_adm_subcat(item_id, subcat_id, code, param, price, amount, fav)
    {
        return `
        <tr data-subcat_id='${subcat_id}'
            data-item_id='${item_id}'
            data-role='subcat_entry'>

            <td title="Код">
            <input data-subcat_id='${subcat_id}'
                   data-item_id='${item_id}'
                   data-role='subcat_code'
                   class='text-form-trackable edit-form input-int'
                   value=${code || DEF_BLANK_VAL_TEXT}>
            </td>

            <td title="Параметр">
                <input data-subcat_id='${subcat_id}'
                       data-item_id='${item_id}'
                       data-role='subcat_param'
                       class='text-form-trackable edit-form input-text' value=${param || DEF_BLANK_VAL_TEXT}>
            </td>

            <td title="Цена">
                <span class='nowrap'>
                    <input data-subcat_id='${subcat_id}'
                           data-item_id='${item_id}'
                           data-role='subcat_price'
                           class='text-form-trackable edit-form input-int' value=${price || 0}>
                </span>
            </td>

            <td title="Количество">
                <span class='nowrap'>
                    <input data-subcat_id='${subcat_id}'
                           data-item_id='${item_id}'
                           data-role='subcat_amount'
                           class='text-form-trackable edit-form input-int' value=${amount || 0}>
                </span>
            </td>

            <td title="Удалить">
                <button class='btn btn-danger'
                        onclick='delete_subcat(${item_id}, ${subcat_id})'>
                        ${LANG.delete}
                </button>
            </td>
        </tr>
        `
    }

    static gen_usr_subcat(item_id, subcat_id, code, param, price, amount, fav)
    {
        return`
        <tr class='${fav?'fav':''}' data-subcat_id='${subcat_id}' data-item_id='${item_id}' data-role='subcat_entry'>
            <td title="Код">
            ${code || DEF_BLANK_VAL_TEXT}
            </td>

            <td title="Параметр">
                ${param || DEF_BLANK_VAL_TEXT}
            </td>

            <td title="Цена">
                <span class='nowrap'>
                    ${price || "?"} грн.
                </span>
            </td>

            <!--
            <td>
                <span class='nowrap'>
                    ${amount || "?"} шт.
                </span>
            </td>
            -->

            <td title="Действия" style='position: relative; padding-left: 0; padding-right: 0;'>
                ${HtmlGen.gen_three_dots(item_id, subcat_id, fav)}
            </td>
        </tr>
        `
    }

    static gen_subcat(item_id, idx, code, param, price, amount, fav)
    {
        if (ADMIN)
            return HtmlGen.gen_adm_subcat(item_id, idx, code, param, price, amount, fav);
        else
            return HtmlGen.gen_usr_subcat(item_id, idx, code, param, price, amount, fav);
    }

    static gen_subcats_table(subcats, item_id)
    {

        let html = ""
        for (let [idx, subcat] of subcats.entries())
        {
            html += HtmlGen.gen_subcat(item_id, idx, subcat.code, subcat.param, subcat.price, subcat.amount, subcat.fav)
        }
        return `<div class=''>
                <table border="0" data-subcat_table='${item_id}' style='max-width: 50%'>
                <tbody>
                    ${html}
                </tbody>
                </table></div>`;
    }

    static gen_adm_photo_image_html(item_id, file, temp)
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
                  class='adm-img ${temp?'temp_image': ''}' ${temp?"":`id='${file}'`}
                  data-item_id='${item_id}'
                  data-role='illustration'
                  ${temp?`data-uuid-promise='${uniqueid}'`:""}
                  ${temp?"":`onclick=handle_image_click(this)`}>`
    }

    // fill photo bulk section in table
    static gen_image_bulk(paths, item_id)
    {
        if (ADMIN)
            return HtmlGen.gen_admin_image_bulk(paths, item_id);
        return HtmlGen.gen_user_image_bulk (paths, item_id);
    }

    static gen_admin_image_bulk(paths, item_id)
    {
        let html = `<div data-item_id='${item_id}' data-role='image_bulk' class='image_bulk_'>`;

        // image preview
        for (let path of paths)
        {
            html += HtmlGen.gen_adm_photo_image_html(item_id, path);
        }
        html += "</div>";

        // delete X photos button
        html += `
                <button class='btn btn-danger mt-1'
                        data-item_id='${item_id}'
                        data-role='delete_images'
                        style='display:none'
                        onclick='delete_selected_photos(${item_id})'>
                </button>`
        return html;
    }

    static gen_user_image_bulk(paths, item_id)
    {
        // bulk wrapper
        let html = `<div data-item_id='${item_id}' data-role='image_bulk' class='image_bulk'>`;

        for (let [i, path] of paths.entries())
        {
            let img_style= "";
            if (i == 0){
                img_style = "bulk_main";
            }

            else if (paths.length == i+1 && i%2==1)
            {
                img_style = "bulk_item bulk_last_uneven";
            }
            else
            {
                img_style = "bulk_item";
            }

            //tset
            img_style = "bulk_item";
            let cont_width = $("#table-container").width() - paths.length * 40;
            let side = Math.min(200, cont_width/paths.length);
            console.log(side);
            html += `<div class='${img_style}'
                          style='width: ${side}px; height: ${side}px; background-image: url("/static/images/min/${path}");'
                          data-role='image_icon'
                          data-path='${path}'
                          onclick='handle_image_click(this)'></div>`
        }
        html += "</div>";

        return html;
    }

    static gen_adm_frame_entry(item)
    {
        return `
            <tr data-item_id='${item.id}' data-role='main_item_data'>
                <td>
                    <textarea rows='1' data-role='item-name' data-item_id='${item.id}' style='overflow:hidden' class='edit-form input-text text-form-trackable'>${item.name}</textarea>
                </td>

                <td colspan=0>
                    ${HtmlGen.gen_subcats_table(item.subcats, item.id)}
                        <button class='btn btn-success btn-lg btn-block'
                                   style='margin-top: 10px'
                                   onclick='add_empty_subcat(${item.id})'>
                                   ${LANG.add}
                           </button>
                </td>

                <td>
                    <select data-role='item-category' data-item_id='${item.id}' class='form-control mr-sm-2 text-form-trackable'>
                        ${HtmlGen.gen_select(item.category)}
                    </select>
                </td>
                <td>
                    <textarea rows='1' data-role='item-description' data-item_id='${item.id}'
                    style='overflow:hidden'
                    class='auto-adjust edit-form input-text text-form-trackable'>${item.description || DEF_BLANK_VAL_TEXT}</textarea>
                </td>
                <td>
                    <textarea rows='1' data-role='item-condition' data-item_id='${item.id}'
                    style='overflow:hidden'
                    class='auto-adjust edit-form input-text text-form-trackable'>${item.condition || DEF_BLANK_VAL_TEXT}</textarea>
                </td>

               <td data-item_id=${item.id} data-role="item-manipulation">
                    <button class='btn btn-danger'
                            onclick=AdminNetworker.delete_item('${item.id}')>
                            ${LANG.delete}
                    </button>

                    <hr>


                </td>

            </tr>

            <tr data-item_id='${item.id}' data-role='photo_item_data'>
                <td colspan='7'>
                ${HtmlGen.gen_image_bulk(item.photo_paths, item.id)}


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

    static gen_usr_frame_entry(item)
    {
        dark = false;
        return `
                <tr class='${dark?"td-dark":""}'>
                    <td title="Открыть на странице" style="font-weight: 600">
                        <a class='link' href='/item/${item.id}'>
                            ${item.name}
                        </a>
                        <br>
                        <a class='link small-text' onclick='PageActions.open_in_new_window("/item/${item.id}")'>
                            В новой вкладке
                        </a>
                    </td>

                    <td title="Подкатегории">

                        ${HtmlGen.gen_subcats_table(item.subcats, item.id)}
                    </td>

                    <td title="Состояние" class='p-3'>
                        Состояние ${item.condition || DEF_BLANK_VAL_TEXT}
                    </td>

                    <td class='p-4'>${item.description || DEF_BLANK_VAL_TEXT}</td>
                </tr>

                <tr class='${dark?"td-dark":""} photo-row'>
                    <td title="Изображения" colspan='4'>
                        ${HtmlGen.gen_image_bulk(item.photo_paths, item.id)}
                    </td>
                </tr>`
    }

    static gen_frame_entry(item)
    {
        if (ADMIN)
        {
            return HtmlGen.gen_adm_frame_entry(item);
        }
        return HtmlGen.gen_usr_frame_entry(item);
    }

    // genarates frame in which
    //items of same category will be placed
    // may be table or div or whatever
    static gen_cat_frame(category)
    {
        return `
        <div class='flex body-main-content'><h3 class='mb-4'>${category}</h3></div>
        <div class='body-main-content' >
        <table class='table table-bordered table-stripped'>

            <thead class='thead thead-dark'>
                <tr>
                ${ADMIN?
                `<th>${LANG.name}</th>
                 <th>${LANG.cats}</th>
                 <th>${LANG.category}</th>
                 <th>${LANG.desc}</th>
                 <th>${LANG.cond}</th>
                 <th>${LANG.delete}</th>`:
                `<th>${LANG.name}</th>
                 <th>${LANG.cats}</th>
                 <th>${LANG.cond}</th>
                 <th>${LANG.desc}</th>`}

                </tr>
            </thead>

            <tbody data-category='${category}' data-role="category-frame">
            </tbody>
            </table>
            </div>`
    }

    static gen_main_frame_content()
    {
        return `<div class="flex"><p id='empty-query-banner'></p></div>

                <div id="table-container" class='body-main-content'>
                    <!-- to be filled with JS -->
                </div>`
    }

    static gen_mono_frame()
    {
        let thead = ADMIN?`<thead class='thead thead-dark'>
            <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Фото</th>
            <th>Характеристики</th>
            <th>Состояние</th>
            <th>Удалить</th>
            </tr>
        </thead>`:
        `<thead class='thead thead-dark'>
            <tr>
            <th>Название</th>
            <th>Описание</th>
            <th>Состояние</th>
            <th>Характеристики</th>
            </tr>
        </thead>`

        return `<table class='table table-bordered table-stripped'>
                ${thead}
                <tbody id='mono-table'>
                </tbody>
                </table>`;
    }

    static gen_fav_table(fav_items)
    {
        if (fav_items.length == 0)
        {
            $(`#fav_container`).append(`<p style='text-align: center; color: white;'>
                                            Ваша корзина пустая.
                                        </p>
                                        <div onclick='Renderer.close_fav_table()'
                                             id='collapse_fav_tab'>
                                             <i class="fas fa-angle-up"></i>
                                        </div>`);
            return;
        }

        $(`#fav_container`).append(`<div class='scrollable'>
                                        <div id='fav-items-cont'></div>

                                       <div class='flex'>
                                         <div onclick='Renderer.close_fav_table()'
                                             id='collapse_fav_tab'>
                                             <i class="fas fa-angle-up"></i>
                                         </div>
                                      </div>

                                      </div>`)
        for (let item of fav_items)
        {
            $(`#fav-items-cont`).append(
                `<table class='table table-bordered'>
                    <thead class='thead thead-dark'>
                        <tr>
                            <th colspan='3'>
                                ${item.name}
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td colspan='2'>
                                <table>
                                    ${HtmlGen.gen_subcat(item.id, item.subcat_id, item.code, item.param, item.price, item.amount, true)}
                                </table>
                            </td>
                            <td>${item.description || DEF_BLANK_VAL_TEXT}</td>
                        </tr>

                        <tr>

                            <td colspan='3'>
                            <button class='btn btn-warning btn-lg' onclick="Renderer.open_order_form(${item.id}, ${item.subcat_id})">Заказать</button>

                                <a class='btn btn-warning btn-lg nowrap' onclick='PageActions.open_in_new_window("/item/${item.id}")'>Открыть в новом окне</a>
                            </td>
                        </tr>
                    </tbody>
                </table>`)
        }
    }

}
