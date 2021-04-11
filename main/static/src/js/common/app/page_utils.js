import {isMobile} from "../utils"

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

    static scroll_to(sel, delay)
    {
        let scrollheight = isMobile() ? $(sel).offset().top : $(sel).offset().top-$(".mynavbar").height();
        $('html, body').animate({ scrollTop:  scrollheight}, delay || 1000);
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

export default PageActions
