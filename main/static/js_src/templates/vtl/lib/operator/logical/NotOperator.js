class NotOperator extends Operator
{
    static sign = "!";
    static priority = 10;
    static unary = true;
    static runnable = (left)=>{console.log("not operator:", left); return !left};

    constructor(expr)
    {
        super(expr);
    }
}
