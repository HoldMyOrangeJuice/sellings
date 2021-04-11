import Tag from "./BaseTag"

class EndForTag extends Tag
{
    static modifier = "$";
    static tag_name = "for";

    

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}
export default EndForTag
