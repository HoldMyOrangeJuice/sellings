class CommaOperator extends Operator
{
    static priority = 1;
    static sign = ",";
    static runnable = (left, right)=>
    {
        if (left.push===undefined )
            return new ArrayWrapper([left, right]);
        else
        {
            left.push(right);
            return left;
        };
    }
}
