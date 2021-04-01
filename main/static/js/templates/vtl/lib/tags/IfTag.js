class IfTag extends LogicalTag
{
    static related_tags = ["ElseIfTag", "ElseTag"]
    static modifier = "$";
    static tag_name = "if";
    static closeTagClass = "EndIfTag";
    static mainTagClass = "IfTag";
    static blockClass = "IfBlock";


    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}
