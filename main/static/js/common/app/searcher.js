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

        this.load_more(true);

    }

    static async load_more(should_wipe)
    {
        if (this.disabled || this.fetch_blocked || this.part >= this.max_parts)
            return;

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
            DOM.queryBanner().html(`Ни один предмет не подошел к запросу<br>
            "${ Searcher.query || CATS[Searcher.cat] || Searcher.id }".
            <br>`)
        }
        else
        {
            DOM.queryBanner().html(`Найдено результатов: ${total}`);
            if (should_wipe)
            {
                Renderer.wipe_content();
            }
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
