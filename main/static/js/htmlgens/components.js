'use strict';

function select(a, u)
{
    if (ADMIN)
        return a;
    return u;
}

var ImageViewer = new Component(
`<div id='image_viewer'>
    <div class="modal-backdrop fade show"></div>
    <div id='image_viewer_content'>

        <p></p>

        <button class="close image_viewer_close" onclick="Renderer.close_image_view_window()">
          <span aria-hidden="true">&times;</span>
        </button>

        <p></p>

        <button id='viewer_prev' class='btn btn-warning img-viewer-nav'><i class="fas fa-angle-left"></i></button>
        <!-- img main -->
        <div id="image_main" style='background-image: url("{% active >> media %}")'>
        </div>

        <button id='viewer_next' class='btn btn-warning img-viewer-nav'><i class="fas fa-angle-right"></i></button>


        <!-- icons -->
        <div id='image_icons'>
            {$ for image_icon of icons $}
                <div style='background-image: url("{% image_icon >> min %}")'
                     class='bulk_item img-icon {$ if active == image_icon $} active {$ endif $} '></div>
            {$ endfor $}

        <div>
        </div>
    </div>
</div>`, "ImageViewer"
);

var SelectDropdown = new Component(
    `<select data-role='item-category'
     data-item_id='{% item.id %}'
     class='form-control mr-sm-2 text-form-trackable'>

     {$ for category of Object.values(CATS) $}

         {$ if category == selected $}
             <option selected='selected'> {% category %} </option>
        {$ else $}
             <option> {% category %} </option>
         {$ endif $}
     {$ endfor $}

    </select>`, "SelectDropdown"
);

var ThreeDots = new Component(
    `<div style='display: inline-block' class="dropdown three-dots">
      <button class="three-dots-btn"
              type="button"
              id="dropdownMenuButton"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false">
        <i class="fas fa-ellipsis-v" style='font-size: 15px;'></i>
      </button>

      <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
        <div class="dropdown-item" data-item_id='{% item.id %}'
             data-subcat_idx='{% subcat_idx %}'
             data-role='cart-action'
             data-checked='{% subcat.fav %}'
             onclick='edit_favourite({% item.id %}, {% subcat_idx %})'>

             {$ if subcat.fav $}
                <span>Убрать из корзины</span><i style="margin-left: 4px; color: gray" class="fas fa-trash-alt"></i>
             {$ else $}
                <span>Добавить в корзину</span><i style="margin-left: 2px; color: gray" class="fas fa-shopping-cart"></i>
             {$ endif $}

        </div>

        <div class="dropdown-item" onclick='OrderForm.open({% item.id %}, {% subcat_idx %})'>
            <span>Заказать</span><i style='margin-left: 5px; color: gray' class="fas fa-money-check"></i>
        </div>
      </div>
    </div>`, "ThreeDots"
);

var AdminSubcat = new Component(
    `<tr data-subcat_id='{% subcat_idx %}'
        data-item_id='{% item.id %}'
        data-role='subcat_entry'>

        <td title="Код">
        <input data-subcat_id='{% subcat_idx %}'
               data-item_id='{% item.id %}'
               data-role='subcat_code'
               class='text-form-trackable edit-form input-int'
               value='{% subcat.code || DEF_BLANK_VAL_TEXT %}'>
        </td>

        <td title="Параметр">
            <input data-subcat_id='{% subcat_idx %}'
                   data-item_id='{% item.id %}'
                   data-role='subcat_param'
                   class='text-form-trackable edit-form input-text'
                   value='{% subcat.param || DEF_BLANK_VAL_TEXT %}'>
        </td>

        <td title="Цена">
            <span class='nowrap'>
                <input data-subcat_id='{% subcat_idx %}'
                       data-item_id='{% item.id %}'
                       data-role='subcat_price'
                       class='text-form-trackable edit-form input-int'

                       value='{% subcat.price || DEF_BLANK_VAL_NUM %}'>
            </span>
        </td>

        <td title="Количество">
            <span class='nowrap'>
                <input data-subcat_id='{% subcat_idx %}'
                       data-item_id='{% item.id %}'
                       data-role='subcat_amount'
                       class='text-form-trackable edit-form input-int'
                       value={% subcat.amount || 0 %}>
            </span>
        </td>

        <td title="Удалить">
            <button class='btn btn-danger'
                    onclick='delete_subcat({% item.id %}, {% subcat_idx %})'>
                    {% LANG.delete %}
            </button>
        </td>
    </tr>
    `, "AdminSubcat"
);

var UserSubcat = new Component(
    `<tr class='{$ if subcat.fav $} fav {$ endif $}'
         data-subcat_id='{% subcat.subcat_id %}'
         data-item_id='{% item.id %}'
         data-role='subcat_entry'>

        <td title="Код">
            {% subcat.code || DEF_BLANK_VAL_TEXT %}
        </td>

        <td title="Параметр">
            {% subcat.param || DEF_BLANK_VAL_TEXT %}
        </td>

        <td title="Цена">
            <span class='nowrap'>
                {% subcat.price || '?' %} грн.
            </span>
        </td>

        <!--
        <td>
            <span class='nowrap'>
                {% subcat.amount || '?' %} шт.
            </span>
        </td>
        -->

        <td title="Действия"
            style='position: relative; padding-left: 0; padding-right: 0;'>
            {% include ThreeDots %}
        </td>
    </tr>`, "UserSubcat"
);

var Subcategory = select(AdminSubcat, UserSubcat);

var SubcatTable = new Component(
    `<div class=''>
        <table border="0"
               data-subcat_table='{% item.id %}'
               style='max-width: 50%'>
            <tbody>
                {$ for subcat_idx, subcat of item.subcats >> enumerate $}
                    {% include Subcategory %}
                {$ endfor $}
            </tbody>
        </table>
    </div>`, "SubcatTable"
);

var AdminImage = new Component(
    `<img src='{$ if temp $} placeholder {$ else $} {% file >> media %} {$ endif $}'
          class='adm-img {$ if temp $} temp_image {$ endif $}'
          data-item_id='{% item.id %}'
          data-role='illustration'

          {$ if !temp $}
            id='{% file %}'
          {$ endif $}

          {$ if temp $}
              data-uuid-promise='{% uniqueid %}'
              onclick=handle_image_click(this)
          {$ endif $}>
    `, "AdminImage"
);

var AdminImageBulk = new Component(
    `<div data-item_id='{% item.id %}'
          data-role='image_bulk'
          class='image_bulk'>

         {$ for file of item.photo_paths $}
            {$ let temp = false $}
            {% include AdminImage %}
         {$ endfor $}

    </div>

    <button class='btn btn-danger mt-1'
            data-item_id='{% item.id %}'
            data-role='delete_images'
            style='display:none'
            onclick='delete_selected_photos({% item.id %})'>
    </button>
      `, "AdminImageBulk"
);

var UserImageBulk = new Component(
    `<div data-item_id='{% item.id %}'
          data-role='image_bulk'
          class='image_bulk'>

        {$ for path of item.photo_paths $}

            {$ let side = (Math.min(200,($("#table-container").width()-item.photo_paths.length*40)/item.photo_paths.length)) $}


            <div class='bulk_item'
                 style='width: {% side %}px; height: {% side %}px;
                 background-image: url("{% path >> media %}");'
                 data-role='image_icon'
                 data-path='{% path %}'
                 onclick='handle_image_click(this)'></div>
        {$ endfor $}

    </div>`, "UserImageBulk"
);

var ImageBulk = select(AdminImageBulk, UserImageBulk)

var AdminFrameEntry = new Component(
    `<tr data-item_id='{% item.id %}'
         data-role='main_item_data'>

        <td>
            <textarea rows='1'
                      data-role='item-name'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='edit-form input-text text-form-trackable'>
                      {% item.name %}
            </textarea>
        </td>

        <td colspan=0>
            {% include SubcatTable %}

            <button class='btn btn-success btn-lg btn-block'
                    style='margin-top: 10px'
                    onclick='add_empty_subcat({% item.id %})'>
                        {% LANG.add %}
            </button>
        </td>

        <td>
            {$ let selected = item.category $}
            {% include SelectDropdown %}
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-description'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.description || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

        <td>
            <textarea rows='1'
                      data-role='item-condition'
                      data-item_id='{% item.id %}'
                      style='overflow:hidden'
                      class='auto-adjust edit-form input-text text-form-trackable'>
                      {% item.condition || DEF_BLANK_VAL_TEXT %}
            </textarea>
        </td>

       <td data-item_id={% item.id %}
           data-role="item-manipulation">

            <button class='btn btn-danger'
                    onclick=AdminNetworker.delete_item('{% item.id %}')>
                    {% LANG.delete %}
            </button>

            <hr>
        </td>
    </tr>

    <tr data-item_id='{% item.id %}' data-role='photo_item_data'>
        <td colspan='7'>
        {% include ImageBulk %}
        <hr>
        <label for='{% "edit-file-"+item.id %}' class='btn btn-success'>
            {% LANG.add %}
        </label>

            <form data-item_id='{% item.id %}' data-role='add_files_form'>
                <input type='file'
                       data-item_id='{% item.id %}'
                       data-role='add_files_input'
                       multiple='multiple'
                       class='hidden'
                       name='photo'
                       id='{% "edit-file-"+item.id %}'>
            </form>
        </td>
    </tr>`, "AdminFrameEntry"
);

var UserFrameEntry = new Component(
    `<tr>
        <td title="Открыть на странице" style="font-weight: 600; width: 25%">
            <a class='link' href='/item/{% item.id %}'>
                {% item.name %}
            </a>
            <br>
            <a class='link small-text' onclick='PageActions.open_in_new_window("/item/{% item.id %}")'>
                В новой вкладке
            </a>
            <br>
            <button class='mt-4 btn btn-dark'
                    onclick='OrderForm.open({% item.id %})'>Заказать</button>
        </td>

        <td title="Подкатегории" style="width: 30%">
            {% include SubcatTable %}
        </td>

        <td title="Состояние" class='p-3' style="width: 20%">
            Состояние {% item.condition || DEF_BLANK_VAL_TEXT %}
        </td>

        <td class='p-4'> {% item.description || DEF_BLANK_VAL_TEXT %} </td>
    </tr>

    <tr photo-row' style="width: 25%">
        <td title="Изображения" colspan='4'>
            {% include ImageBulk %}
        </td>
    </tr>`, "UserFrameEntry"
);

var FrameEntry = select(AdminFrameEntry, UserFrameEntry)

var CategoryFrame = new Component(
    `
    <div class='flex body-main-content'><h3 class='mb-4'>{% category %}</h3></div>
    <div class='body-main-content' >
    <table class='table table-bordered table-stripped'>

        <thead class='thead thead-dark'>
            <tr>
             {$ if ADMIN $}
                 <th>{% LANG.name %}</th>
                 <th>{% LANG.cats %}</th>
                 <th>{% LANG.category %}</th>
                 <th>{% LANG.desc %}</th>
                 <th>{% LANG.cond %}</th>
                 <th>{% LANG.delete %}</th>
             {$ else $}
                 <th>{% LANG.name %}</th>
                 <th>{% LANG.cats %}</th>
                 <th>{% LANG.cond %}</th>
                 <th>{% LANG.desc %}</th>
             {$ endif $}
            </tr>
        </thead>

        <tbody data-category='{% category %}' data-role="category-frame">
        </tbody>
        </table>
        </div>`, "CategoryFrame"
);

var MainFrame = new Component(
    `<div class="flex"><p id='empty-query-banner'></p></div>
    <div id="table-container" class='body-main-content'>
    <!-- to be filled with JS -->
    </div>`, "MainFrame"
);

var MonoFrame = new Component(
    `<table class='table table-bordered table-stripped'>

        <thead class='thead thead-dark'>
            <tr>
                {$ if ADMIN $}
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Фото</th>
                    <th>Характеристики</th>
                    <th>Состояние</th>
                    <th>Удалить</th>
                {$ else $}
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Состояние</th>
                    <th>Характеристики</th>
                {$ endif $}
            </tr>
        </thead>

        <tbody id='mono-table'>
        </tbody>
    </table>`, "MonoFrame"
);

var FavouriteItem = new Component(
    `<table class='table table-bordered'>
        <thead class='thead thead-dark'>
            <tr>
                <th colspan='3'>
                    {% item.name %}
                </th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td colspan='2'>
                    <table>

                        {$ let subcat_idx = item.subcat_id $}
                        {$ let subcat = item $}
                        {% include Subcategory %}
                    </table>
                </td>
                <td> {% item.description || DEF_BLANK_VAL_TEXT %}</td>
            </tr>

            <tr>

                <td colspan='3'>
                    <button class='btn btn-warning btn-lg'
                            onclick="OrderForm.open({% item.id %}, {% item.subcat_idx %})">Заказать</button>

                    <a class='btn btn-warning btn-lg nowrap'
                       onclick='PageActions.open_in_new_window("/item/{% item.id %}")'> Открыть в новом окне
                    </a>
                </td>
            </tr>
        </tbody>
    </table>`, "FavouriteItem"
)

var FavouriteTable = new Component(
    ` <div class='scrollable'>
        <div id='fav-items-cont'>

            {$ if fav_items.length == 0$}
                <p style='text-align: center; color: white;'>
                    Ваша корзина пустая.
                </p>
            {$ endif $}

            {$ for item of fav_items $}
                {% include FavouriteItem %}
            {$ endfor $}

        </div>

        <div class='flex'>
          <div onclick='Renderer.close_fav_table()'
              id='collapse_fav_tab'>
              <i class="fas fa-angle-up"></i>
          </div>
       </div>
   </div>
    `, "FavouriteTable"
);
