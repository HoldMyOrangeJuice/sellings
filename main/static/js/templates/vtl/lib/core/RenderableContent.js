// this class stores renderable wrappers for html, tags and blocks
// used by blocks to store its content
class RenderableContent
{
    constructor(renderables)
    {
        this.content = renderables || [];
    }

    add(renderable)
    {
        this.content.push(renderable);
    }

    render(context)
    {
        context.__locals__.addLayer()

        let html = "";
        for (let renderable of this.content)
        {
            html += renderable.render(context);
        }

        context.__locals__.popLayer()
        return html;
    }
}
