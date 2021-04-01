class FilterOperator extends Operator
{
    static sign = ">>";
    static priority = 1;
    static runnable = (left, right)=>vtl.filters[right](left);
    static use_raw_right = true;
    constructor(expr)
    {
        super(expr);
    }
}
