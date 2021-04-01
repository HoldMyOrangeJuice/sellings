class ForTag extends Tag
{
    static blockClass = "ForBlock";
    static closeTagClass = "EndForTag";
    static mainTagClass = "ForTag";

    static related_tags = []
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
