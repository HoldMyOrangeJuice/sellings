import Element from "../../templates/vtl/lib/core/Element"

class DOM
{
    // main item table
    static queryBanner()
    {
        return new Element('#empty-query-banner')
    }

    static main()
    {
        return new Element('#main');
    }

    static catFrame(category)
    {
        return new Element(`[data-category='${category}'][data-role="category-frame"]`)
    }

    // parent of all category containers
    static tableContainer()
    {
        return new Element(`#table-container`);
    }

    static monoFrame()
    {
        return new Element("#mono-table");
    }

    static favouriteTable()
    {
        return new Element("#fav_container")
    }
}

export default DOM
