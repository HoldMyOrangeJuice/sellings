class IfBlock extends Block
{
    static mainTagClass = "IfTag";

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {

            let bool = (comp.head instanceof ElseTag) || comp.head.evaluate(context);

            if (bool)
            {
                html += comp.content.render(context);
                break;
            }
        }
        return html;
    }
}
