class Operator extends ClassNameResolver
{
    static priority = -1;
    static sign = "not implenented"
    static unary = false;
    // defines whether evaluator will try to evaluate operand or not
    static use_raw_left = false;
    static use_raw_right = false;

    // R for right L for left
    static accepts_undefined = "";

    static registeredInstances = [
        "PlusOperator",
        "DotOperator",
        "CommaOperator",
        "EqualsOperator",
        "MinusOperator",
        "MultiplicationOperator",
        "DivisionOperator",
        "OrOperator",
        "FilterOperator",
        "NewOperator",
        "NotOperator"
    ]

    static runnable = (left, right)=>undefined;

    constructor()
    {
        super();
        this.priority = this.constructor.priority;
    }

    static matches(expression_string)
    {
        return operator === this.sign;
    }

    evaluate(context, left, right)
    {
        if ((left === undefined && (!this.constructor.accepts_undefined.includes("L")) )
        || (right === undefined && (!this.constructor.unary) &&
            !this.constructor.accepts_undefined.includes("R")))
        {
            throw new Error("evaluate was called on operator without any left or right value.")
        }

        let left_value = this.constructor.use_raw_left ? left.expression : (left.evaluate===undefined ? left : left.evaluate(context));
        let right_value = this.constructor.use_raw_right ? right.expression : (right === undefined ? undefined : (right.evaluate === undefined ? right : right.evaluate(context)));
        
        let runnable_returned = this.constructor.runnable(left_value, right_value);

        // rerurn operand and not just value for compatability
        // basically just wrapper there
        return new AnyOperand(runnable_returned);
    }
}
