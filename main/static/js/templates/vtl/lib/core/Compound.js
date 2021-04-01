// this thing is used just to keep data together
class Compound
{
    constructor(head, content)
    {
        if (content && !(content instanceof RenderableContent) )
        {
            throw new Error("content of compound must be RenderableContent instance")
        }
        this.head = head;
        this.content = content;
    }

    render(context)
    {
        return this.head.render(context) + this.content.render(context);
    }
}
