import Parser from "./BaseParser"

import TagManager from "../core/manager/TagManager"
import BlockManager from "../core/manager/BlockManager"

import Linker from "../core/Linker"

import Compound from "../core/Compound"
import RenderableContent from "../core/RenderableContent"
import RenderableHtmlWrapper from "../core/RenderableHtmlWrapper"

class CallHyerarchyRecorder
{
    constructor(name)
    {
        this.name = name;
        this.subcalls_of_this_func = {}
        this.time = 0;
        this.calls = 0;

    }

    addCall(name, time)
    {
        let duration = Date.now() - time;
        let lrec = this.getRecorder(name)
        lrec.time += duration;
        lrec.calls ++;
    }

    getRecorder(name)
    {
        if (this.subcalls_of_this_func[name] !== undefined)
        {
            return this.subcalls_of_this_func[name];
        }
        else
        {
            this.subcalls_of_this_func[name] = new CallHyerarchyRecorder(name);
            return this.subcalls_of_this_func[name];
        }
    }

    log_this(nesting_level = 0)
    {
        let clr = "color:" + ((this.time/this.calls)>1?"red":"green");
        console.log(`%c${"|".repeat(Math.max(0, nesting_level-1))}${'╚'.repeat(nesting_level != 0)}\
        ${this.name}: ${this.calls} calls; ${this.time} ms.`, clr);
    }

    log(nesting=0)
    {
        this.log_this(nesting);
        for (let sub_call of Object.keys(this.subcalls_of_this_func))
        {
            this.subcalls_of_this_func[sub_call].log(nesting + 1);
        }
    }
}

class TagParser extends Parser
{
    static recorder = new CallHyerarchyRecorder("root");

    constructor(content, ptr)
    {
        super(content, ptr);

    }

    // returns tag object or false
	hasTagNext(tagClass, check_for_end)
    {

        let stime = Date.now();
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
            //console.log("hasTagNext: " + () + "ms.");
            let val = new tagClass(inner + tagClass.getTagEnd());
            return val
        }

        return false;
    }

	// for example {% if %} tag has {% else %} or {% else if %} or {% endif %}
	compoundHasRelatedTagNext(block)
    {
        let stime = Date.now()
        if (!block)
        {
            print("block class is null", "red");
            return false;
            //throw new Error("trying to read next tag when there is no tag")
        }
        let mainTag = Linker.getMainTagClass(block);

		for (let tagClass of Linker.getRelatedTags(mainTag)) {

            let cls = tagClass;

            let tag = this.hasTagNext(cls);
			if (tag){
				return tag
            }
        }
        //console.log("compoundHasRelatedTagNext: " + (Date.now() - stime) + "ms.");

        this.constructor.recorder.addCall("compoundHasRelatedTagNext", stime)
        if (Linker.getClosingClass(mainTag))
        {
            let tagNext = this.hasTagNext( Linker.getClosingClass(mainTag) )
            return !!tagNext
        }
        return false;
    }

    // really weird thing
    // hasTagNext does it but takes tag as arg
    // how does it save content? it doesnt
    // returns whole tag constructon wrapped in tag obj:
    // {% a + b %}
	readTag(leave_ptr_where_it_is)
    {

        let stime = Date.now()
        let lrec = this.constructor.recorder.getRecorder("readTag");

		let content = ""
        let a = Date.now();
        let tag = TagManager.getTagClass(this.content, this.ptr);
        lrec.addCall("getTagClass", a);
        let ptr = this.ptr;

        let tag_end_sequence = tag.getTagEnd();
		while (ptr < this.content.length)
		{

            let char = this.content[ptr];
            a = Date.now();
            let squence_len = this.hasSequenceNext(tag_end_sequence, ptr);
            lrec.addCall("hasSequenceNext", a);

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

                //print(`tag read done at line: ${this.line}`, "green")
                //console.log("readTag: " + (Date.now() - stime) + "ms.");
                this.constructor.recorder.addCall("readTag", stime)
                return tagObj;
            }
			content += char;
			ptr++
		}

        throw new Error("parse Error");

    }

    // returns full tag without moving ptr
	peekReadTag() {
        return this.readTag(true);
    }

    // reads everything from tag to start of other tag
    // so next call to readCompound will start at tag for sure
	readCompound(block)
    {
        let stime = Date.now();
        // we know there is tag at the start

        let a = Date.now();
        let lrec = this.constructor.recorder.getRecorder("readCompound");
        let headTag = this.readTag();
        lrec.addCall("readTag", a);
        let compound = new Compound();
        let html = "";
        let contentRenderable = new RenderableContent();


		while(this.hasNext())
        {
            let char = this.get();
            a = Date.now();
			this.tag_class = TagManager.getTagClass(this.content, this.ptr);
            lrec.addCall("getTagClass", a);

            if (this.tag_class) {
                // recursively read compund to exclude situations when
                // closing tag of inner compound closes outer compound
                if (this.tag_class.isCompoundStart())
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html))
                    a = Date.now();
                    contentRenderable.add(this.readBlock());
                    lrec.addCall("readBlock", a);
                    html = "";
                }
                // parse tags that are not compounds
                else if (!Linker.isCompoundable(this.tag_class))
                {
                    contentRenderable.add(new RenderableHtmlWrapper(html));
                    a = Date.now();
                    contentRenderable.add(this.readTag());
                    lrec.addCall("readTag", a);
                    html = "";
                }
                // TODO: if related do that stuff \/
            }

            // TODO: we already have tag parsed above, can save on parsing here
			if (this.compoundHasRelatedTagNext(block))
            {
                contentRenderable.add(new RenderableHtmlWrapper(html));

				compound.head = headTag
				compound.content = contentRenderable;
                //console.log("end of compound: ", compound);
                //console.log("readCompound: " + (Date.now() - stime) + "ms.");

                this.constructor.recorder.addCall("readCompound", stime)
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
        let stime = Date.now()
        let lrec = this.constructor.recorder.getRecorder("readBlock");
		let opening_tag = this.peekReadTag();
        let a = Date.now();
        let blockClass = BlockManager.getBlockClass(opening_tag);
        lrec.addCall("getBlockClass", a)
        let block = new blockClass();

        //print("======= read block " + blockClass.name + " =======", "green");

		while (!this.peekReadTag().constructor.isCompoundEnd())
		{
            a = Date.now();
			let compound = this.readCompound(block)
            lrec.addCall("readCompound", a)
			block.add(compound)
		}
        a = Date.now();
		this.readTag() // move pointer from end tag

        lrec.addCall("readTag", a)
        //print("block:", "green");
        //console.log(block);
        //console.log("readBlock: " + (Date.now() - stime) + "ms.");

        this.constructor.recorder.addCall("readBlock", stime);
		return block;
	}
}

export default TagParser
