import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from 'sb-shared-lib';

// TODO add refresh function

@Injectable({
    providedIn: 'root'
})
export class EmbeddedApiService {
    constructor(
        protected api: ApiService
    ) {}

    public async createView(model:string,view_id:string) {
        this.api.fetch("?do=core_config_create-view&view_id="+view_id+"&entity="+model);
    }

    public getErrorstring(x:any): string {
        let res = "{";
        for(let key in x) {
            res += " "+key +" : "+x[key]+" ";
        }
        return res + "}";
    }

    
    public async deleteView(entity:string,view_id:string): Promise<any|undefined>{
        try {
            await this.api.fetch("?do=core_config_delete-view&entity="+entity+"&view_id="+view_id);
            return undefined;
        }
        catch(response) {
            this.api.errorFeedback(response);
            return response;
        }

    }

    public async createPackage(package_name: string) {
        this.api.fetch("?do=core_config_create-package&package="+package_name);
    }

    public async listPackages(): Promise<string[]> {
        try {
            return await this.api.fetch("?get=core_config_packages");
        }
        catch(response) {
            console.error(response);
            return [];
        }
    }

    public async listModelFrom(pkg:string):Promise<string[]> {
        try {
            return (await this.api.fetch('?get=core_config_classes'))[pkg];
        }
        catch (response: any) {
            console.warn('fetch class error', response);
        }
        return [];
    }

    public async listAllModels(): Promise<string[]> {
        try {
            let x = (await this.api.fetch('?get=core_config_classes'));
            let ret:string[] = [];
            for(let key in x) {
                console.log(key);
                for(let item of x[key]) {
                    ret.push(key+"\\"+item);
                }
            }
            return ret;
        }
        catch (response: any) {
            console.warn('fetch class error', response);
        }
        return [];
    }

    public async listViewFrom(pkg:string,entity:string|undefined=undefined):Promise<string[]|undefined> {
        if(entity === undefined) {
            try {
                return (await this.api.fetch('?get=core_config_views&package='+pkg));
            }
            catch (response: any) {
                console.warn('fetch class error', response);
            }
            return [];
        }
        else {
            try {
                return (await this.api.fetch('?get=core_config_views&entity='+pkg+'\\'+entity));
            }
            catch (response: any) {
                console.warn('fetch class error', response);
            }
            return [];
        }

    }

    public async listControlerFromPackageAndByType(pkg:string,type:"data"|"actions"|"apps",pkname:boolean=false):Promise<string[]> {
        try {
            let temp:string[] = (await this.api.fetch("?get=core_config_controllers&package="+pkg))[type];
            if(pkname) {
                return temp;
            }
            let res:string[] = [];
            for(let item of temp) {
                res.push(item.split("_").slice(1).join("_"));
            }
            return res;
        }
        catch {
            return [];
        }

    }

    public async listControllersByType(type:"data"|"actions"|"apps"):Promise<string[]> {
        try {
            let res:string[] = [];
            let pkgs = (await this.listPackages());
            if(pkgs) {
                for(let pkg of pkgs) {
                    let temp:string[] = (await this.api.fetch("?get=core_config_controllers&package="+pkg))[type];
                    for(let item of temp) {
                        res.push(item);
                    }
                }
            }
            return res;
        }
        catch {
            return [];
        }
    }

    public async createController(pkg:string,name:string,type:"do"|"get") {
        this.api.fetch("?do=core_config_create-controller&controller_name="+name+"&controller_type="+type+"&package="+pkg);
    }

    public async createModel(pkg:string,name:string,parent:string){
        this.api.fetch("?do=core_config_create-model&model="+name+"&package="+pkg+(parent === "equal\\orm\\Model" ? "" : "&extends="+parent));
    }

    public async getSchema(entity: string):Promise<any> {
        if (entity) {
            try {
                return await this.api.fetch('?get=core_model_schema&entity=' + entity);
            }
            catch (response: any) {
                console.warn('request error', response);
                return {"fields" : []};
            }
        }
        return {"fields" : []};
    }

    public async getRoutesByPackage(pkg:string) {
        try {
            return await this.api.fetch('?get=core_config_routes&package=' + pkg);
        }
        catch (response: any) {
            return [];
        }
    }

    public async getAllRouteFiles():Promise<string[]> {

        let result:string[] = [];
        let x:string[];
        try {
            x = (await this.api.fetch('?get=core_config_packages'));
        }
        catch (response: any) {
            x =  [];
        }
        for(let pkg of x){
            let files:{[file:string]:any}
            try {
                files = (await this.api.fetch('?get=core_config_routes&package=' + pkg));
            }
            catch {
                files = {};
            }
            for(let file in files) {
                result.push(file);
            }
        }
        return result;

    }

    public async createroute(pkg:string,file:string,url:string):Promise<boolean> {
        try {
            await this.api.fetch("?do=core_config_create-route&package="+pkg+"&file="+file+"&url="+url);
            return true;
        }
        catch {
            return false;
        }
    }

    public async getTypeList() {
        try {
            return Object.keys(await this.api.fetch("?get=core_config_types"));
        }
        catch {
            return [];
        }
    }

    public async getTypeDirective() {
        try {
            return await this.api.fetch("?get=core_config_types");
        }
        catch {
            return [];
        }
    }

    public async getUsageList() {
        try {
            let x = await this.api.fetch("?get=core_config_usage");
            let y = this.construct_usage_list(x);
            return y.filter((v:string) => !v.endsWith("/")).sort((a:string,b:string) => {
                for(let i = 0; i < a.length && i < b.length ; i++) {
                    if( a < b ) return -1;
                    if( a > b ) return 1;
                }
                return a.length - b.length;
            })
        }
        catch {
            return [];
        }
    }

    protected construct_usage_list(object:any,):string[] {
        let result = Object.keys(object);
        Object.keys(object).forEach((element) => {
            result = result.concat(
                Object.keys(object[element])
                    .map((field) => (!isNaN(parseFloat(field)) && isFinite(parseFloat(field))) ? field = `${element}/${object[element][field]}` : `${element}/${field}`)
            )
        })
        return result;
    }

    public async deletePackage(pkg:string):Promise<any> {
        try {
            await this.api.fetch("?do=core_config_delete-package&package="+pkg);
            return undefined;
        }
        catch(response) {
            this.api.errorFeedback(response);
            return response;
        }
    }

    public async deleteModel(pkg:string,model:string):Promise<any> {
        try {
            await this.api.fetch("?do=core_config_delete-model&package="+pkg+"&model="+model);
            return undefined;
        }
        catch(response) {
            this.api.errorFeedback(response);
            return response;
        }
    }

    public async deleteController(pkg:string, type:string, name:string): Promise<any> {
        try {
            await this.api.fetch("?do=core_config_delete-controller&package="+pkg+"&controller_name="+name+"&controller_type="+type);
            return undefined;
        }
        catch(response) {
            this.api.errorFeedback(response);
            return response;
        }
    }

    public async getView(entity:string, name:string):Promise<any> {
        try {
            return await this.api.fetch("?get=core_model_view&view_id="+name+"&entity="+entity)
        } catch (response) {
            return {}
        }
    }

    public async getViews(package_name:string, entity:string): Promise<string[]> {
        try {
            return await this.api.fetch("?get=core_config_views&package="+package_name+"&entity="+entity);
        }
        catch(response) {
            return [];
        }
    }

    public async getInitData(pkg:string, type:string):Promise<{[id:string]:any}> {
        try {
            return (await this.api.fetch(`?get=core_config_init-data&package=${pkg}&type=${type}`));
        }
        catch {
            return {};
        }
    }

    public async updateInitData(pkg:string,type:string,payload:string): Promise<boolean> {
        try {
            await this.api.post(`?do=core_config_update-init-data&package=${pkg}&type=${type}`,{payload:payload});
            return true;
        }
        catch(e) {
            console.log(e);
            this.api.errorFeedback(e);
            return false;
        }
    }

    public async getWorkflow(pkg:string,model:string):Promise<any> {
        try {
            return {exists : true, info : await this.api.get(`?get=core_model_workflow&entity=${pkg}\\${model}`)};
        }
        catch(e:any) {
            const cast:HttpErrorResponse = e;
            if(cast.status === 404) {
                return {exists : false, info : {}};
            }
            else {
                this.api.errorFeedback(e);
                return {};
            }
        }
    }

    public async saveWorkflow(pkg:string,model:string,payload:string):Promise<boolean> {
        try {
            await this.api.post(`?do=core_config_update-workflow&entity=${pkg}\\${model}`,{payload : payload});
            return true;
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return false;
        }
    }

    public async createWorkflow(pkg:string,model:string):Promise<boolean> {
        try {
            await this.api.post(`?do=core_config_create-workflow&entity=${pkg}\\${model}`);
            return true;
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return false;
        }
    }

    public async fetchMetaData(code:string,reference:string): Promise<any[]> {
        try {
            return await this.api.get(`?get=core_model_collect&entity=core\\Meta&fields=[value]&domain=[[code,=,${code}],[reference,=,${reference}]]`);
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return [];
        }
    }

    public async createMetaData(code:string,reference:string,payload:string): Promise<boolean> {
        try {
            await this.api.post(`?do=core_model_create&entity=core\\Meta`,{"fields" : {"value" : payload, "code" : code, reference : reference}});
            return true;
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return false;
        }
    }

    public async saveMetaData(id:number,payload:string):Promise<boolean> {
        try {
            await this.api.post(`?do=core_model_update&entity=core\\Meta&id=${id}`,{"fields" : {"value" : payload}});
            return true;
        }
        catch(e) {
            console.error(e)
            this.api.errorFeedback(e)
            return false
        }
    }

    public async getAllInstanceFrom(entity:string,fields:string[] = []):Promise<any[]> {
        try {
            return await this.api.get(`?get=core_model_collect&entity=${entity}&fields=${JSON.stringify(fields)}`);
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return [];
        }
    }

    public async saveUML(pkg: string, type: string, path: string, payload: string): Promise<boolean> {
        try {
            await this.api.post(`?do=core_config_update-uml&package=${pkg}&type=${type}&filename=${path}`,{"payload":payload});
            return true;
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return false;
        }
    }

    public async getUMLList(type:string):Promise<{[id:string]:string[]}> {
        try {
            return await this.api.get(`?get=core_config_umls&type=${type}`);
        }
        catch(e) {
            this.api.errorFeedback(e);
            return {};
        }
    }

    public async getUMLContent(pkg:string, type:string, path:string):Promise<any[]> {
        try {
            return await this.api.get(`?get=core_config_uml&package=${pkg}&type=${type}&path=${path}`);
        }
        catch(e) {
            console.error(e);
            this.api.errorFeedback(e);
            return [];
        }
    }

    /**
     * Get all the domain's operators for each type.
     *
     * @returns An object with key-values.
     */
    public async getValidOperators() {
        try {
            return await this.api.fetch('?get=core_config_domain-operators');
        } catch (response: any) {
            console.warn('request error', response);
        }
    }

    /**
     * Return all the usages
     *
     * @returns a JSON with all the usages
     */
    public async getUsages() {
        try {
            return await this.api.fetch('?get=config_usage');
        } catch (response: any) {
            console.warn('request error', response);
        }
    }


    /**
     * Return all the packages available.
     *
     * @returns A array with all packages
     */
    public async getPackages() {
        try {
            return await this.api.fetch('?get=config_packages');
        }
        catch (response: any) {
            console.warn('fetch package error', response);
        }
    }

    public async getControllers(eq_package: string) {
        try {
            return await this.api.fetch('?get=core_config_controllers&package=' + eq_package);
        }
        catch (response: any) {
            console.warn('request error', response);
        }
    }

    /**
     * Return the announcement of a controller
     *
     * @param string type_controller the action of the controller(do or get)
     * @param string eq_package name of the package
     * @param string name of the controller
     * @returns array with the announcement of a controller
     */
    public async getAnnounceController(type_controller?: string, name?: string) {
        try {
            if(!type_controller || !name) {
                throw 'missing param';
            }
            return await this.api.fetch('?' + type_controller + '='+ name + '&announce=true');
        }
        catch (response: any) {
            console.log('unable to fetch controller announcement', response);
        }
        return null;
    }

    /**
     * Return the respond of a controller after execution
     *
     * @param string type_controller the act
     * @param string eq_package name of the
     * @param string name of the controller
     * @param array all the parameters for the controller
     * @returns array with the respond of a controller's execution
     */
    public async submitController(type_controller: string, controller_name: string, params: []):Promise<{err:boolean,resp:any}> {
        let stringParams = '';
        for(let key in params) {
            if(Array.isArray(params[key])) {
                stringParams += '&' + key + '=' + JSON.stringify(params[key])
            } else {
                stringParams += '&' + key + '=' + params[key];
            }
        }
        try {
            return {err : false, resp: (await this.api.fetch('?' + type_controller + '=' + controller_name + stringParams))};
        }
        catch (response) {
            return {err : true, resp:response}
        }
    }





    /**
     * Return all the routes available.
     *
     * @return A array with all routes
     */
    public async getRoutes() {
        try {
            return await this.api.fetch('?get=config_live_routes');
        }
        catch (response: any) {
            console.warn('fetch package error', response);
        }
    }

    public async updateController(name:string,type:string,payload:any):Promise<boolean> {
        try {
            await this.api.fetch(`?do=core_config_update-controller&controller=${name}&operation=${type}&payload=${JSON.stringify(payload)}`)
            return true
        } catch(resp) {
            //@ts-expect-error
            if(resp.status >= 300) {
                this.api.errorFeedback(resp)
                return false
            }
            return true
        }
    }

    public async getDataControllerList(pkg:string):Promise<string[]> {
        try {
        return (await this.api.fetch("?get=core_config_controllers&package="+pkg))['data']
        } catch {
        return []
        }
    }

    /**
     * Return the announcement of a controller
     *
     * @param string type_controller the action of the controller(do or get)
     * @param string eq_package name of the package
     * @param string name of the controller
     * @returns array with the announcement of a controller
     */
        public async doAnnounceController(name: string) {
        try {
            return await this.api.fetch('?do=' + name + '&announce=true');
        }
        catch (response: any) {
            return null;
        }
        }

    public async getAllActionControllers():Promise<string[]> {
        try {
        let packs:string[] = await this.api.fetch('?get=core_config_packages')
        let contrs = []
        for(let pkg of packs) {
            let temp:{[type:string]:string[]} = await this.api.fetch('?get=core_config_controllers&package='+pkg)
            for(let cont of temp["actions"]) {
            contrs.push(cont)
            }
        }
        return contrs
        } catch {
        return []
        }
    }

    public async getCoreGroups():Promise<any> {
        try {
            return await this.api.fetch('?get=core_model_collect&fields=[name]&lang=en&domain=[]&order=id&sort=asc&entity=core\\Group');
        }
        catch (response: any) {
            return  [];
        }
    }

    public async saveView(payload:any,entity:string,viewid:string):Promise<boolean> {
        try {
        await this.api.fetch("?do=core_config_update-view&entity="+entity+"&view_id="+viewid+"&payload="+JSON.stringify(payload))
        }
        catch {
        return false
        }
        return true
    }

    public async getWidgetTypes():Promise<{[id:string]:string[]}> {
        try {
        return await this.api.fetch("?get=core_config_widget-types")
        }
        catch {
        return {}
        }
    }



    /**
     * // TODO
     *
     * @param old_node - The name of the old package.
     * @param new_node - The name of the new package.
     */
    public updatePackage(old_node: string, new_node: string) {
        // TODO
        console.warn("Update name package, old name: ", old_node, ", new name: ", new_node);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of package for the new class.
     * @param new_class - The name of the new class.
     */
    public createClass(eq_package: string, new_class: string) {
        // TODO
        console.warn("New class name: ", new_class);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of the package of the class.
     * @param old_node - The name of the old class.
     * @param new_node - The name of the new class.
     */
    public updateClass(eq_package: string, old_node: string, new_node: string) {
        // TODO
        console.warn("Update name package, old name: ", old_node, ", new name: ", new_node);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of the package for eq_class.
     * @param eq_class - The name of the class.
     */
    public deleteClass(eq_package: string, eq_class: string) {
        // TODO
        console.warn("Package deleted: ", eq_class);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of the package for eq_class.
     * @param eq_class - The name of the class for new_field.
     * @param new_field - The new name of the field.
     */
    public createField(eq_package: string, eq_class: string, new_field: string) {
        // TODO
        console.warn("New field name: ", new_field);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of the package for eq_class.
     * @param eq_class - The name of the class for new_field.
     * @param old_node - The old name of the field.
     * @param new_node - The new name of the field.
     */
    public updateField(eq_package: string, eq_class: string, old_node: string, new_node: string) {
        // TODO
        console.warn("Update name field, old name: ", old_node, ", new name: ", new_node);
    }

    /**
     * // TODO
     *
     * @param eq_package - The name of the package for eq_class.
     * @param eq_class - The name of the class for new_field.
     * @param field - The name of the field.
     */
    public deleteField(eq_package: string, eq_class: string, field: string) {
        // TODO
        console.warn("Field deleted: ", field);
    }

    /**
     * Return all the classes foreach package
     *
     * @returns A JSON with package as key and classes as value.
     */
    public async getClasses() {
        try {
            return await this.api.fetch('?get=core_config_classes');
        }
        catch (response: any) {
            console.warn('fetch class error', response);
        }
    }

    /**
     * Return all the available types and foreach type, the properties and foreach property, the type.
     *
     * @returns A JSON of each type with key-values.
     */
    public async getTypes() {
        try {
            return await this.api.fetch('?get=config_types');
        }
        catch (response: any) {
            console.warn('fetch types error', response);
        }
    }


    /**
     * @param new_schema - The new schema
     */
    public async updateSchema(new_schema: {}, eq_package: string, eq_class: string) {
        try {
            return await this.api.fetch('?do=config_update-model&part=class&entity=' + eq_package + "\\" + eq_class + '&payload=' + JSON.stringify(new_schema));
        }
        catch (response: any) {
            console.warn('request error', response);
        }
        console.log('#### schema updated', new_schema);
    }



}
