class NewOperator extends Operator
{
    static sign = "new";
    static priority = 1;
    static accepts_undefined = "R"
    static use_raw_left = true;
    static runnable = (left, right)=>
    {
        let constructor = Operator.resolve(left);
        
        if(right instanceof Array)
            return new constructor(...right);
        return new constructor(right);
    }


    constructor(expr)
    {
        super(expr);
    }
}
