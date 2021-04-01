class EndForTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "for";
    static mainTagClass = "ForTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}
