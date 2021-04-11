import Tag from "./BaseTag"

class ForTag extends Tag
{
    

    static modifier = "$";
    static tag_name = "for";

    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
export default ForTag
