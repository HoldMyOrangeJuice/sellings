class ElseIfTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "elseif";
    mainTagClass = "IfTag";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
