import Block from "./BaseBlock"
import ElseTag from "../tags/ElseTag"
import ElseIfTag from "../tags/ElseIfTag"

class IfBlock extends Block
{
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
export default IfBlock
