import Searcher from "./searcher"

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
        this.messageField().text("")
    }

    static set_subcat(idx)
    {
        this.subcatField().val(idx);
    }

    static setWaitingState(state)
    {
        if (state)
        {
            $("#order-backdrop").show();
            this.modal().find(".modal-content").append(Spinner.render());
        }
        else
        {
            $("#order-backdrop").hide();
            this.modal().find(".spinnerComponent").remove();
        }
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

        localStorage.setItem("username", this.form().find("[name='username']").val())
        localStorage.setItem("phone", this.form().find("[name='phone']").val())

        this.setWaitingState(true);
        let response = await Networker.submit_order();
        this.setWaitingState(false);

        if (response.success)
        {
            this.close();
            this.clearMessage();
        }
        else
        {
            let hints = response.payload;
            this.show_hints(hints);
        }
    }

    static show_hints(hints)
    {
        $(".order-form-hint").remove();

        for (let field_name of Object.keys(hints))
        {
            let message = hints[field_name];
            let field = this.form().find(`[name='${field_name}']`)
            $( `<p class='order-form-hint'>${message}</p>` ).insertAfter( field );
        }
    }

    static close()
    {
        this.set_subcat(undefined);
        this.modal().modal( "hide" );
    }

    static async open(item_id, subcat_idx)
    {
        $(".order-form-hint").remove();
        $("#order-subcat-selection").remove();
        $("#orderModal").find("textarea[name='message']").val("");

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

        $('#order_form_item_id').val(item_id);
        $('#item-data').html(`<span>${item.name}</span> <span>${item.condition || ""}</span>`)

        let name = localStorage.getItem("username")
        let phone = localStorage.getItem("phone")

        this.form().find("[name='username']").val(name)
        this.form().find("[name='phone']").val(phone)

        $('#orderModal').modal('show');

    }
}

export default OrderForm
