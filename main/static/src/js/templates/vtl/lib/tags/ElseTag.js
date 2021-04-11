import LogicalTag from "./LogicalTagBase"

class ElseTag extends LogicalTag
{
    static modifier = "$";
    static tag_name = "else";

    

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
export default ElseTag
