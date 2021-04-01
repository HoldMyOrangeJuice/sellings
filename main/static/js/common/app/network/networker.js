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
        //let data = serializeForm(OrderForm.form());
        //console.log(data);
        let data = new FormData($('#orderModal').find('form')[0])
        console.log(data);
        return Networker.POST(data, ORDER_URL);
    }

    static async get_fav_items()
    {
        let data = await this.GET({}, GET_FAVOURITE_URL);
        return data.payload.items;
    }
}
