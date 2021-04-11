import LogicalTag from "./LogicalTagBase"

class ElseIfTag extends LogicalTag
{
    static modifier = "$";
    static tag_name = "elseif";


    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

export default ElseIfTag
