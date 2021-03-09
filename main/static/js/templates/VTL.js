const filter_scope = "vtl.filters";
const localvarstack_scope = "vtl.locals"


function getScope(scope, init_with)
{
    let obj = window;
    let parts = scope.split(".");
    for (let [i, path] of parts.entries())
    {
        let child = obj[path];
        if (!child)
        {
            if (init_with)
            {
                if (i == parts.length - 1) {
                    obj[path] = init_with
                }
                else {
                    obj[path] = {}
                }
                child = obj[path]
            }
            else
            {
                return;
            }
        }
        obj = child;
    }
    return obj;
}

function findInStack(name)
{
    let stack = getScope(localvarstack_scope)
    let value;
    for (let scope of stack)
    {
        if (scope[name] != undefined)
        {
            value = scope[name]
        }
    }
    return value;
}

function setInScope(scope, varname, value)
{
    getScope(scope)[varname] = value;
}

function setScope(scope, object)
{
    getScope(scope, object);
}

function registerCustomFilter(name, cb)
{
    setInScope(filter_scope, name, cb);
}

// adds local variable to context on stack
function addLocal(name, value)
{
    let stack = getScope(localvarstack_scope);
    let context = stack[stack.length-1];
    // TODO: remove this. stack cant be empty:
    // its initialized before rendering with global context
    if (!context)
    {
        context = stack[0] = {};
    }
    context[name] = value;
    setScope(localvarstack_scope, stack);
}

// add context onto stack
function addOnContextStack()
{
    let scope = getScope(localvarstack_scope, []);
    scope.push({});
}

// remove context from stack
function popContextStack()
{
    let stack = getScope(localvarstack_scope);
    stack.pop();
}

function emptyStack()
{
    getScope(localvarstack_scope) = [];
}

function getValue(name, context)
{
    // serch for var everywhere
    let global_var = window[name];
    let context_var = context[name];
    let stack_var = findInStack(name);
    if (context_var || stack_var || global_var)
    {
        // if global var was required, save it as local copy
        return context[name] = context_var || stack_var || global_var;
    }

    if (name.includes("."))
    {
        let path = ""
        let parts = name.split(".")
        let obj = window;
        for (let child of parts)
        {
            obj = obj[child];
            if (!obj)
            {
                break;
            }
        }
        if (obj)
        {
            context[name] = obj;
            return obj;
        }
    }

    // evaluate expressions
    // TODO: replace with filters
    let local_context = Component.getLocalContext(context);
    let context_text = "";
    for (let key of Object.keys(local_context)) {
        context_text += `let ${key} = local_context.${key}\n`
    }
    eval(`${context_text}\ncontext.temp_var = ${name}`)
    return context.temp_var;
}

class Element
{
    constructor(jq_selector)
    {
        this.__proto__.__proto__ = $(jq_selector);
    }

    addComponent(component, context)
    {
        if (! (component instanceof Component))
        {
            throw new Error("component is not instance of Component")
        }
        print("start render " + component.name, "green");
        let html = component.render(context || {});
        this.append(html);
        return this;
    }
}

function print(msg, color)
{
    console.log(`%c${msg}`, `color:${color}`);
}

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

const MOBILE_ONLY=1, DESKTOP_ONLY=2, UNIVERSAL=3;
class CManager
{
    static register(component, name, mode)
    {
        console.log(component, name, mode);
        if (mode == UNIVERSAL ||
           (mode == MOBILE_ONLY && isMobile() ||
            mode == DESKTOP_ONLY && !isMobile()))
            {
                this[name] = component;
                component.name = name;
            }
    }
}
class Component
{
	constructor(template)
    {
        this.tag_class;
        this.parser = new Parser(template);
        this.name = name || "UNKNOWN";
        this.cache = false;
    }

    static getLocalContext(glob_context)
    {
        let flat = {};
        for (let scope of getScope(localvarstack_scope))
        {
            for (let varname of Object.keys(scope))
            {
                if (scope[varname] != undefined){
                    flat[varname] = scope[varname]
                }
            }
        }
        return {...glob_context, ...flat};
    }

    static generateContext(context)
    {
        let eval_var_ctx = "";

        for (let varname of Object.keys( context || {} ))
        {
            eval_var_ctx += `let ${varname} = context.${varname};\n`;
        }

        return eval_var_ctx;
    }

	render(context)
    {
        let html = "";
        addOnContextStack();

        if (this.cache)
        {
            for (let renderable of this.cache)
            {
                html += renderable.render(context);
            }
            return html;
        }
        this.cache = [];

        let prs = this.parser;

		while (prs.hasNext())
        {
            let prtag = this.tag_class;
			this.tag_class = TagManager.getTagClass(prs.content, prs.ptr)

            let char = prs.get();

			if (this.tag_class && this.tag_class.isCompoundStart())
            {
                try
                {
                    let block = prs.readBlock()
                    this.cache.push(new RenderableHtmlWrapper(html));
                    html = "";
                    this.cache.push(block);
    				//html += block.render(context)
                }
                catch (e)
                {
                    console.log("could not parse block");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }

            }
			else if (this.tag_class)
            {
                try{
                let tag = prs.readTag()
				//html += tag.render(context);
                this.cache.push(new RenderableHtmlWrapper(html));
                html = "";
                this.cache.push(tag);
                }
                catch (e)
                {
                    console.log("could not parse Tag:");
                    print(prs.getDebugTextPeek(), "red");
                    console.log("line " + prs.line + " of " + this.name);
                    console.log("error", e);
                    throw e;
                }
            }
            else
            {
                html += char;
                prs.next();
            }
        }
        if (html)
            this.cache.push(new RenderableHtmlWrapper(html));

		return this.render(context);
    }
}

// this class stores renderable wrappers for html, tags and blocks
// used by blocks to store its content
class RenderableContent
{
    constructor(renderables)
    {
        this.content = renderables || [];
    }

    add(renderable)
    {
        this.content.push(renderable);
    }

    render(context)
    {
        addOnContextStack();

        let html = "";
        for (let renderable of this.content)
        {
            html += renderable.render(context);
        }

        popContextStack();
        return html;
    }
}

class Tag
{
    // some static things here
    static related_tags = ["not Implemented"]
    static modifier = "not Implemented";
    static tag_name = "not Implemented";

    static compoundClass;
    static closeTagClass = null;
    static mainTagClass = null;

    static tagEndPrefix = "end";

    constructor(content)
    {
        this.content = content;
    }

    static isCompoundStart()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundEnd()
    {
        throw new Error("Not Implenemted")
    }

    static isCompoundable()
    {
        return !!this.mainTagClass?.compoundClass;
    }

    // returns opening of tag: {% if
    static getTagStart()
    {
        return `{${this.modifier}${this.isCompoundEnd()?this.tagEndPrefix:""}${this.tag_name}`
    }

    // returns closing part of tag: $}
    static getTagEnd()
    {
        return `${this.modifier}}`
    }

    static getClosingClass()
    {
        return this.closeTagClass;
    }

    createCompound()
    {
        return new this.constructor.compoundClass();
    }

    clean()
    {
        let clean = "";
        let parser = new Parser(this.content);

        let skip_open_tag = parser.hasSequenceNext(this.constructor.getTagStart());
        let skip_end_tag = false;
        while (skip_end_tag == false && parser.hasNext())
        {
            skip_end_tag = parser.hasSequenceNext(this.constructor.getTagEnd());
            parser.next();
        }

        // idk why +1 needs to be there
        // seems to work tho
        clean = this.content.substring(skip_open_tag+1, this.content.length - skip_end_tag);
        return clean;
    }

    // used to display html and to do additional processing
    render(context)
    {
        throw new Error("Not Implenemted")
    }

    // default evaluation behaviour.
    // will just eval expression within passed context
    // should be overridden for sure
    evaluate(context)
    {
        //if (!context)
        //throw new Error("Stack trace");
        let ctx = Component.getLocalContext(context);
        let strCtx = Component.generateContext(ctx);
        let oldctx = context
        // swap contexts so local variables will be defined in global context
        context = ctx;
        let res = eval(strCtx + this.clean());
        // and then swap back
        context = oldctx
        return res;

    }
}

class Parser
{

    constructor(content, ptr)
    {
        this.ptr = ptr || 0;
    	this.content = content;
        this.line = 0;
    }

    getDebugTextPeek()
    {
        return this.content.substring(
            Math.max(0, this.ptr-50),
            Math.min(this.content.length-1, this.ptr+50)
        );
    }

    hasNext()
    {
        return this.ptr < this.content.length;
    }

    next()
    {
        this.ptr++;
        if (this.get() == "\n")
        {
            this.line++;
        }
    }

    get()
    {
        return this.content[this.ptr];
    }

    // returns tag object or false
	hasTagNext(tagClass)
    {
        if (!tagClass || typeof tagClass != "function")
        {
            throw new Error("tag object can't be " + tagClass)
        }

        let inner = "";
        let ptr = this.ptr;

        let open_seq = tagClass.getTagStart();
        let seq_len = this.hasSequenceNext(open_seq, ptr)

        if (seq_len)
        {
            //ptr += seq_len;
            while(!this.hasSequenceNext(tagClass.getTagEnd(), ptr))
            {
                let char = this.content[ptr];
                if (ptr == this.content.length)
                {
                    throw new Error("Parse Error")
                }

                inner += char;
                ptr++;
            }
            return new tagClass(inner + tagClass.getTagEnd());
        }
        return false;
    }

	// for example {% if %} tag has {% else %} or {% else if %} or {% endif %}
	compoundHasRelatedTagNext(block)
    {
        if (!block)
        {
            print("block class is null", "red");
            return false;
            //throw new Error("trying to read next tag when there is no tag")
        }

        let mainTag = block.constructor.mainTagClass;


		for (let tagClass of mainTag.related_tags) {
            let tag = this.hasTagNext(tagClass);
			if (tag){
				return tag
            }
        }
		return mainTag?.getClosingClass() &&
        this.hasTagNext( mainTag.getClosingClass() )
    }

    // returns whole tag constructon wrapped in tag obj:
    // {% a + b %}
	readTag(leave_ptr_where_it_is)
    {
		let content = ""
        let tag = TagManager.getTagClass(this.content, this.ptr);
        let ptr = this.ptr;

        let tag_end_sequence = tag.getTagEnd();
		while (ptr < this.content.length)
		{

            let char = this.content[ptr];
            let squence_len = this.hasSequenceNext(tag_end_sequence, ptr);

            if (squence_len)
            {
                content += tag_end_sequence;

                // jump over end tag
                ptr += squence_len;

                if (!leave_ptr_where_it_is)
                {
                     // add one so pointer points to new char
                     // and not to closing tag
                     this.ptr = ptr+1;
                }

                let tagObj = new tag(content);


                return tagObj;
            }
			content += char;
			ptr++
		}

        throw new Error("parse Error");

    }

    // does not change actual ptr
    hasSequenceNext(sequence, _ptr)
    {
        //console.log("check seq", sequence, "in",  this.content.substring(_ptr || this.ptr));
        let tag_check_idx = 0;
        let ptr = _ptr || this.ptr;
        let something_matched = false;
        while(ptr < this.content.length)
        {
            if (tag_check_idx == sequence.length )
            {
                // compensate plus at the end of loop
                ptr--;
                break; // full sequence checked
            }

            let char = this.content[ptr];

            if (char == " " && something_matched)
            {
                ptr++;
                continue;
            }

            if (sequence[tag_check_idx] != char)
            {
                return false;
            }
            something_matched = true;
            tag_check_idx++;
            ptr++;
        }

        // 0 or diff betw start and end
        // (acual length of sequence cuz it can vary bec of spaces)
        if (tag_check_idx == sequence.length)
        {
            //print("found", "green");
            return ptr - (_ptr || this.ptr);
        }
        return false;

    }

    // returns full tag without moving ptr
	peekReadTag() {
        return this.readTag(true);
    }

    // reads everything from tag to start of other tag
    // so next call to readCompound will start at tag for sure
	readCompound(block)
    {
        // we know there is tag at the start
        let headTag = this.readTag();
        let compound = headTag.createCompound();
        let html = "";
        let contentRenderable = new RenderableContent();


		while(this.hasNext())
        {
            let char = this.get();
			this.tag_class = TagManager.getTagClass(this.content, this.ptr);

            if (this.tag_class) {

                // recursively read compund to exclude situations when
                // closing tag of inner compound closes outer compound
                if (this.tag_class.isCompoundStart())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html))
                    contentRenderable.add(this.readBlock());
                    html = "";
                }

                // parse tags that are not compounds
                else if (!this.tag_class.isCompoundable())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html));
                    contentRenderable.add(this.readTag());
                    html = "";
                }
            }

			if (this.compoundHasRelatedTagNext(block))
            {
                contentRenderable.add(new RenderableHtmlWrapper(html));

				compound.head = headTag
				compound.content = contentRenderable;
                //console.log("end of compound: ", compound);
				return compound;
			}

            // make sure not to save first char of tag
            // todo FIX THIS MESS
            if (!this.tag_class)
            {
                html += char;
                this.next();
            }
        }
        throw new Error("reached end while serching for closing tag\nyor template is bad")
    }


	readBlock()
	{
		let opening_tag = this.peekReadTag();
        let blockClass = BlockManager.getBlockClass(opening_tag.constructor);
        let block = new blockClass();

        print("======= read block " + blockClass.name + " =======", "green");

		while (!this.peekReadTag().constructor.isCompoundEnd())
		{
			let compound = this.readCompound(block)
			block.add(compound)
		}
		this.readTag() // move pointer from end tag
		return block;
	}
}

// All tags that inherit from FilteredTag
// will be preprocessed in constructor
let filters = {"enumerate": (a)=>a.entries()};
setScope(filter_scope, filters)

class FilteredTag extends Tag
{
    static filterOperator = ">>";

    constructor(content)
    {
        super(content);
        this.content = FilteredTag.apply(this.clean())
    }

    static apply(expression)
    {
        let parser = new Parser(expression);

        let pre_filter = "";
        if (!expression.includes(this.filterOperator))
        {
            return expression
        }

        let matches = expression.matchAll(`[^\\s]*\\s*${this.filterOperator}\\s*[^\\s]*`);
        let processed_expr = "";
        let expr_process_end_idx = 0;
        for (let match of matches)
        {
            let match_segment = match[0];
            let first_val = match_segment.match(`^[^\\s]*`)
            let last_val = match_segment.match(`(?<=${this.filterOperator}\\s*)\\S.*`)

            processed_expr += expression.substring(expr_process_end_idx, match.index);
            processed_expr += `${filter_scope}.${last_val}(${first_val})`
            expr_process_end_idx = match.index + match_segment.length;
        }
        return processed_expr;
    }
}

// this thing is used just to keep data together
class Compound
{
    constructor(head, content)
    {
        if (content && !(content instanceof RenderableContent) )
        {
            throw new Error("content of compound must be RenderableContent instance")
        }
        this.head = head;
        this.content = content;
    }

    render(context)
    {
        return this.head.render(context) + this.content.render(context);
    }
}

Tag.compoundClass = Compound;

class Block
{
    static mainTagClass = null;
    constructor()
    {
        this.compounds = [];
    }

    add(compund)
    {
        this.compounds.push(compund);
    }

    render()
    {
        throw new Error("Not Implenemted")
    }
}

class RenderableHtmlWrapper
{
    constructor(html)
    {
        this.content = html;
    }
    render(context)
    {
        return this.content;
    }
}

class LogicalTag extends FilteredTag
{
    evaluate(context)
    {
        let ctx = Component.generateContext(context)
        let expr = this.clean();
        let logicalExpr = getValue(expr, context);

        return eval(ctx + "!!(logicalExpr)")
    }
}

class LetTag extends FilteredTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "let";

    constructor(content)
    {
        super(content)
    }

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    evaluate(context)
    {
        let cont = this.clean();
        let parts = cont.split(" ")
        parts.remove("")
        if (parts.length == 3)
        {
            let x_var = parts[0];
            let mode = parts[1];
            let expr = parts[2];

            if (mode == "=")
            {
                let eval_ctx = Component.generateContext(context);
                let value;

                let val = getValue(expr, context);
                addLocal(x_var, val);
                //context[x_var] = val
                //context[x_var] = value;
            }
        }
    }

    render(context)
    {
        this.evaluate(context);
        return "";
    }
}

// implementations
class ForTag extends FilteredTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "for";
    static mainTagClass = ForTag;
    static closeTagClass; // set later
    static blockClass; // set later

    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class EndForTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "for";
    static mainTagClass = ForTag;

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}

class ElseIfTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "elseif";
    static mainTagClass; // set later

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class ElseTag extends LogicalTag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "else";
    static mainTagClass; // set later

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class EndIfTag extends Tag
{
    static related_tags = []
    static modifier = "$";
    static tag_name = "if";
    static mainTagClass; // set later

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return true;
    }
}

class ForBlock extends Block
{
    static mainTagClass = ForTag;
    static iterateOperator = "of"
    static unpackVarnamesRegex = `[^\\s^,]*(?=\\s*[,\\s])`;

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {
            let expr = comp.head.clean()
            if (!expr.includes(ForBlock.iterateOperator))
            {
                return;
            }

            let [lval, rval] = expr.split(ForBlock.iterateOperator)
            let varnames = [];

            for (let vname of lval.matchAll(ForBlock.unpackVarnamesRegex))
            {
                if (vname[0]){
                    varnames.push(vname[0]);
                }
            }
            // {$ for x of y $}

            let iterable = getValue(rval, context);

            for (let packed of iterable)
            {
                if (packed instanceof Array && varnames.length != packed.length)
                {
                    throw new Error(`Expected ${varnames.length} args but got ${packed.length}`)
                }

                for (let [i, varname] of varnames.entries())
                {
                    let value;
                    if (packed instanceof Array)
                    {
                        value = packed[i];
                    }
                    else
                    {
                        value = packed;
                    }
                    context[varname] = value;
                }
                html += comp.content.render(context);
            }
            delete context.temp_iterator;

        }
        return html;
    }
}

ForTag.blockClass = ForBlock;
ForTag.closeTagClass = EndForTag;

class IfBlock extends Block
{
    static mainTagClass;

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {

            let bool = (comp.head instanceof ElseTag) || comp.head.evaluate(context);

            if (bool)
            {
                html += comp.content.render(context);
                break;
            }
        }
        return html;
    }
}

class IfTag extends LogicalTag
{
    static related_tags = [ElseIfTag, ElseTag]
    static modifier = "$";
    static tag_name = "if";
    static closeTagClass = EndIfTag;
    static mainTagClass = IfTag;
    static blockClass = IfBlock;


    static isCompoundStart()
    {
        return true;
    }

    static isCompoundEnd()
    {
        return false;
    }
}

class IncludeTag extends FilteredTag
{
    static related_tags = []
    static modifier = "%";
    static tag_name = "include";

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        let template_name = this.clean().replaceAll(" ", "");
        let component = context[template_name] || window[template_name] || CManager[template_name];
        if (!component)
        {
            return "invalid component";
        }
        return component.render(context);
    }
}

EndIfTag.mainTagClass = IfTag;
ElseIfTag.mainTagClass = IfTag;
IfBlock.mainTagClass = IfTag;
ElseTag.mainTagClass = IfTag;


class ExecuteTag extends FilteredTag
{
    static related_tags = []
    static modifier = "%";
    static tag_name = ""; // execute tag does not have any keyword

    static isCompoundStart()
    {
        return false;
    }

    static isCompoundEnd()
    {
        return false;
    }

    render(context)
    {
        let val = this.evaluate(context);
        return val;
    }
}

class TagManager
{
    // execute tag should be last since it does not have prefix.
    // that means execute tag will match anything
    static registered_tags = [
        LetTag, IncludeTag, ExecuteTag,
        IfTag, EndIfTag, ElseIfTag, ElseTag,
        ForTag, EndForTag
    ];
    static getTagClass(content, ptr)
    {

        for (let tagClass of this.registered_tags)
        {
            let parser = new Parser(content, ptr)

            if (parser.hasTagNext(tagClass))
            {
                return tagClass;
            }
        }
        return false;
    }
}

class BlockManager
{
    static getBlockClass(tag)
    {
        return tag.mainTagClass.blockClass;
    }
}
