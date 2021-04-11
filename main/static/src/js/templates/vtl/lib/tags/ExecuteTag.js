import Tag from "./BaseTag"

class ExecuteTag extends Tag
{
    
    static modifier = "%";
    static tag_name = ""; // execute tag does not have any keyword

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        return this.evaluate(context);
    }
}
export default ExecuteTag
