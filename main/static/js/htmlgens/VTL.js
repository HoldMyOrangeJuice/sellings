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

class Component
{
	constructor(template)
    {
        this.tag_class;
        this.parser = new Parser(template);
    }

	render(context)
    {

		let html = ""
        let prs = this.parser;

		while (prs.hasNext())
        {
            let prtag = this.tag_class;
			this.tag_class = TagManager.getTagClass(prs.content, prs.ptr)

            let char = prs.get();
            if (this.tag_class){
                print(this.tag_class.name, "orange");
            }
			if (this.tag_class && this.tag_class.isCompoundStart())
            {
				let block = prs.readBlock()
				html += block.render(context)
                console.log("block: ", block);
            }
			else if (this.tag_class)
            {
                let tag = prs.readTag()
                console.log("standalone tag: ", tag);
				html += tag.render(context);
            }
            else
            {
                html += char;
                prs.next();
            }
        }
		return html
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
        let html = "";
        for (let renderable of this.content)
        {
            html += renderable.render(context);
        }
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
        console.log(this);
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

    render(context)
    {
        throw new Error("Not Implenemted")
    }
    generateContext(context)
    {
        let eval_var_ctx = "";
        for (let varname of Object.keys(context || {}))
        {
            eval_var_ctx += `let ${varname} = context.${varname};\n`;
        }
        return eval_var_ctx;
    }
    // default evaluation behaviour.
    // will just eval expression within passed context
    // should be overridden for sure
    evaluate(context)
    {
        //if (!context)
        //throw new Error("Stack trace");
        return eval(this.generateContext(context) + this.clean());
    }
}

class Parser
{

    constructor(content, ptr)
    {
        this.ptr = ptr || 0;
    	this.content = content;
    }

    hasNext()
    {
        return this.ptr < this.content.length;
    }

    next()
    {
        this.ptr++;
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

                print("tag read done: ", "green")
                console.log(tagObj, "end: ", ptr, "ptr", this.ptr);

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
                else
                {
                    console.log("tag", this.tag_class.name, "belongs to compound");
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
        console.log("\n\n FOUND END TAG \n\n");
		this.readTag() // move pointer from end tag
        print("block:", "green");
        console.log(block);
		return block;
	}
}

// this thing is used just to keep data together
// shouldnt be renderable edit: why tho?
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
        console.log("\t\trender", this.head, this.content);
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
        console.log(this.compounds);
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

class LogicalTag extends Tag
{
    evaluate(context)
    {
        let ctx = this.generateContext(context)
        let expr = this.clean();
        let executable = `!!(${expr})`;
        return eval(ctx + executable)
    }
}

// implementations
class ForTag extends Tag
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

    render(context)
    {
        return "else";
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

    render(context)
    {
        return "endif was here";
    }
}

class ForBlock extends Block
{
    static mainTagClass = ForTag;

    render(context)
    {
        let html = "";

        for (let comp of this.compounds)
        {
            let expr = comp.head.clean().split(" ").remove("");
            // {$ for x of y $}
            if (expr.length == 3 && expr[1] == "of")
            {
                let y_var = expr[2];
                let x_var = expr[0];
                for (let x of context[y_var])
                {
                    context[x_var] = x;
                    console.log("new context", context);
                    html += comp.content.render(context);
                }
            }
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

    render(context)
    {
        return "if was here";
    }
}

class IncludeTag extends Tag
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
        let component = context[template_name];
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


class ExecuteTag extends Tag
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
    static registered_tags = [IncludeTag, ExecuteTag, IfTag, EndIfTag, ElseIfTag, ElseTag, ForTag, EndForTag];
    static getTagClass(content, ptr)
    {

        for (let tagClass of this.registered_tags)
        {
            let parser = new Parser(content, ptr)

            if (parser.hasTagNext(tagClass))
            {
                console.log(content.substring(ptr, ptr+10) + "...", "is", tagClass.name);
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
