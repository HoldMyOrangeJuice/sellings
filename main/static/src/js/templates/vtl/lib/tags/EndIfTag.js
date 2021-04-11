import Tag from "./BaseTag"

class EndIfTag extends Tag
{
    static modifier = "$";
    static tag_name = "if";



    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}
export default EndIfTag
