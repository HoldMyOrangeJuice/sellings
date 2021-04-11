import LogicalTag from "./LogicalTagBase"

class IfTag extends LogicalTag
{
    static modifier = "$";
    static tag_name = "if";

    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
export default IfTag
