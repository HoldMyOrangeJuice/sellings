//
// DEPRECATED!!!!!!!!!!!!!!!!
// class ClassNameResolver
// {
//     static initialized = false;
//
//     static async initialize()
//     {
//         this.initialized = true;
//         let LetTag = (await import("../tags/LetTag")).default
//         let IfTag = (await import("../tags/IfTag")).default
//         let ElseTag = (await import("../tags/ElseTag")).default
//         let ElseIfTag = (await import("../tags/ElseIfTag")).default
//         let EndIfTag = (await import("../tags/EndIfTag")).default
//         let ForTag = (await import("../tags/ForTag")).default
//         let EndForTag = (await import("../tags/EndForTag")).default
//         let IncludeTag = (await import("../tags/IncludeTag")).default
//         //console.log({LetTag, IfTag, ElseTag, ElseIfTag, EndIfTag, ForTag, EndForTag, IncludeTag});
//
//         this.resolveMap = {LetTag, IfTag, ElseTag, ElseIfTag, EndIfTag, ForTag, EndForTag, IncludeTag}
//     }
//     static async resolve(name)
//     {
//         if (!this.initialized)
//         {
//             await this.initialize();
//         }
//
//
//         //console.log(name);
//         console.log(this.resolveMap);
//         console.log("resolve", name, this.resolveMap);
//         let cls = this.resolveMap[name]
//         console.log(cls);
//         return cls;
//     }
//
//     static async resolveAll(list)
//     {
//         let res = [];
//         for (let item of list)
//         {
//             res.push(await this.resolve(item));
//         }
//         return res;
//     }
//     static async getCached(name)
//     {
//         let varname = name + "__cached__";
//         if (!this[varname])
//         {
//             this[varname] = await this.resolve(this[name]);
//         }
//         return this[varname];
//     }
//
//     static async getCachedList(listName)
//     {
//         let cached_name = listName + "__cached_list__";
//         if (!this[cached_name])
//         {
//             this[cached_name] = await this.resolveAll(this[listName]);
//         }
//         return this[cached_name];
//     }
//
// }
// export default ClassNameResolver
