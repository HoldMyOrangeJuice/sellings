class MultiplicationOperator extends Operator
{
    static runnable = (l, r)=>l*r;
    static sign = "*";
    static priority = 2;
    constructor()
    {
        super();
    }
}
