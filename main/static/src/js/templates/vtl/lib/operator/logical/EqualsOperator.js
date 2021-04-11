import Operator from "../BaseOperator"

class EqualsOperator extends Operator
{
    static runnable = (l, r)=>l==r;
    static sign = "==";
    static priority = 1;
    constructor()
    {
        super();
    }
}
export default EqualsOperator
