import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable,of } from 'rxjs';
import { ApiService } from 'sb-shared-lib';
import { EmbeddedApiService } from 'src/app/_services/embedded-api.service';

import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class WorkbenchService extends EmbeddedApiService {
    private cache:any = {};

    constructor(
            private http: HttpClient,
            api: ApiService) {
        super(api);
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
     * @param package_name - The name of package for the new class.
     * @param new_class - The name of the new class.
     */
    public createClass(package_name: string, new_class: string) {
        // TODO
        console.warn("New class name: ", new_class);
    }

    public getPackagess(): Observable<string[]> {
        return from(this.listPackages()); // Conversion Promise -> Observable
    }
    /**
     * // TODO
     *
     * @param package_name - The name of the package of the class.
     * @param old_node - The name of the old class.
     * @param new_node - The name of the new class.
     */
    public updateClass(package_name: string, old_node: string, new_node: string) {
        // TODO
        console.warn("Update name package, old name: ", old_node, ", new name: ", new_node);
    }

    /**
     * // TODO
     *
     * @param package_name - The name of the package for class_name.
     * @param class_name - The name of the class.
     */
    public async deleteClass(package_name: string, class_name: string) {
        // Problème posé dans eQual, ça marche mais c'est juste que ça affiche comme erreur
        try {
            await this.api.fetch("?do=core_config_delete-model&package="+package_name+"&model="+class_name);
            return undefined;
        }
        catch(response) {
            this.api.errorFeedback(response);
            return response;
        }
    }

    /**
     * // TODO
     *
     * @param package_name - The name of the package for class_name.
     * @param class_name - The name of the class for new_field.
     * @param new_field - The new name of the field.
     */
    public createField(package_name: string, class_name: string, new_field: string) {
        // TODO
        console.warn("New field name: ", new_field);
    }

    /**
     * // TODO
     *
     * @param package_name - The name of the package for class_name.
     * @param class_name - The name of the class for new_field.
     * @param old_node - The old name of the field.
     * @param new_node - The new name of the field.
     */
    public updateField(package_name: string, class_name: string, old_node: string, new_node: string) {
        // TODO
        console.warn("Update name field, old name: ", old_node, ", new name: ", new_node);
    }

    /**
     * // TODO
     *
     * @param package_name - The name of the package for class_name.
     * @param class_name - The name of the class for new_field.
     * @param field - The name of the field.
     */
    public deleteField(package_name: string, class_name: string, field: string) {
        // TODO
        console.warn("Field deleted: ", field);
    }

    /**
     * @param new_schema - The new schema
     */
    public async updateSchema(new_schema: {}, package_name: string, class_name: string) {
        try {
            return await this.api.fetch('?do=config_update-model&part=class&entity=' + package_name + "\\" + class_name + '&payload=' + JSON.stringify(new_schema));
        }
        catch (response: any) {
            console.warn('request error', response);
        }
        console.log('#### schema updated', new_schema);
    }

    public async InitPackage(package_name:string, do_import: boolean, do_cascade:boolean, do_import_cascade:boolean): Promise<boolean> {
        try {
            await this.api.fetch("?do=core_init_package&package="+package_name+(do_import ? "&import=true":"")+"&cascade="+(do_cascade ? "true" : "false")+"&import_cascade="+(do_import_cascade ? "true" : "false"))
            return true;
        }
        catch {
            return false;
        }
    }


    /**
     * Deletes a specified node based on its type.
     *
     * @param node - The node to delete, which contains:
     *  - `package` (optional): The package name associated with the node.
     *  - `name` (required): The name of the node.
     *  - `type` (required): The type of the node (e.g., "view", "menu", "package", "class", "controller").
     *  - `item` (optional): Additional data related to the node.

     * @returns A promise that resolves with a success message (`Deleted <type>: <name>`)
     * if the deletion is successful, or rejects with an error response.
     * 
     * @throws An error if the node type is unknown or if the deletion fails.
     */
    public deleteNode(node: { package_name?: string; name: string; type: string; item?: any }): Observable<any> {
        return from(new Promise(async (resolve, reject) => {
            let res = null;
            try {
                switch (node.type) {
                    case "view": {
                        let [entity, viewId] = node.name.split(":");
                        if (viewId.endsWith(".default")) {
                            return reject("❌ Cannot delete a default view.");
                        }
                        res = await this.deleteView(entity, viewId);
                        break;
                    }
                    case "menu":
                        res = await this.deleteMenu(node.package_name!, node.name);
                        break;
                    case "package":
                        res = await this.deletePackage(node.name);
                        break;
                    case "class":
                        res = await this.deleteClass(node.package_name!, node.name);
                        break;
                    case "do":
                    case "controller":
                        res = await this.deleteController(node.package_name!, node.type, node.name);
                        break;
                    default:
                        return reject("❌ Unknown type");
                }
                res ? reject(res) : resolve(`✅ Deleted ${node.type}: ${node.name}`);
            } catch (error) {
                reject(error);
            }
        }));
    }

    /**
     * TODO
     */
    deleteMenu(arg0: string, name: string): any {
        throw new Error('Method not implemented.');
    }

    /**
     * Return all the packages available.
     *
     * @returns A array with all packages
     */
    public async getPackages(): Promise<string[]> {
        let result = [];
        if(this.cache.hasOwnProperty('packages')) {
            result = this.cache.packages;
        }
        else {
            try {
                result = await this.api.fetch('?get=config_packages');
                this.cache.packages = result;
            }
            catch (response: any) {
                console.warn('fetch package error', response);
            }
        }
        return result;
    }

    public async getInitializedPackages(): Promise<string[]> {
        let result = [];
        if(this.cache.hasOwnProperty('initialized_packages')) {
            result = this.cache.initialized_packages;
        }
        else {
            try {
                result = await this.api.fetch('?get=core_config_live_packages');
                this.cache.initialized_packages = result;
            }
            catch (response: any) {
                console.warn('fetch package error', response);
            }
        }
        return result;
    }

    public async getPackageConsistency(package_name: string ): Promise<any> {
        var result = [];
        if(this.cache.hasOwnProperty('packages_consistency') && this.cache.packages_consistency.hasOwnProperty(package_name)) {
            result = this.cache.packages_consistency[package_name];
        }
        else {
            try {
                if(package_name.length <= 0) {
                    throw 'ignoring empty package';
                }
                result = await this.api.fetch('?do=test_package-consistency&package='+package_name);
                if(!this.cache.hasOwnProperty('packages_consistency')) {
                    this.cache.packages_consistency = {};
                }
                this.cache.packages_consistency[package_name] = result;
            }
            catch (response: any) {
                console.warn('fetch package error', response);
            }
        }
        return result;
    }


    public getClassess(): Observable<{ [package_name: string]: string[] }> {
        return from(this.getClasses()).pipe(
            catchError(error => {
                console.warn('⚠️ Erreur lors de la récupération des classes:', error);
                return of({}); // Retourne un objet vide en cas d'erreur
            })
        );
    }
    
    /**
     * Return all the classes foreach package
     *
     * @returns A JSON with package as key and classes as value.
     */
    public async getClasses(): Promise<{[id: string]: string[]}> {
        let result = {};
        if(this.cache.hasOwnProperty('classes')) {
            result = this.cache.classes;
        }
        else {
            try {
                result = await this.api.fetch('?get=core_config_classes');
                this.cache.classes = result;
            }
            catch (response: any) {
                console.warn('fetch class error', response);
            }
        }
        return result;
    }

    /**
     * Return all the available types and foreach type, the properties and foreach property, the type.
     *
     * @returns A JSON of each type with key-values.
     */
    public async getTypes() {
        let result = {};
        if(this.cache.hasOwnProperty('types')) {
            result = this.cache.types;
        }
        else {
            try {
                result = await this.api.fetch('?get=config_types');
                this.cache.types = result;
            }
            catch (response: any) {
                console.warn('fetch types error', response);
            }
        }
        return result;
    }

    /**
     * Get all the domain's operators for each type.
     *
     * @returns An object with key-values.
     */
    public async getValidOperators() {
        let result = {};
        if(this.cache.hasOwnProperty('operators')) {
            result = this.cache.operators;
        }
        else {
            try {
                result = await this.api.fetch('?get=core_config_domain-operators');
                this.cache.operators = result;
            }
            catch (response: any) {
                console.warn('request error', response);
            }
        }
        return result;
    }

    /**
     * Return all the usages
     *
     * @returns a JSON with all the usages
     */
    public async getUsages() {
        let result = {};
        if(this.cache.hasOwnProperty('usages')) {
            result = this.cache.usages;
        }
        else {
            try {
                result = await this.api.fetch('?get=config_usage');
                this.cache.usages = result;
            }
            catch (response: any) {
                console.warn('request error', response);
            }
        }
        return result;
    }

        /**
     * Return the announcement of a controller
     *
     * @param string controller_type the action of the controller(do or get)
     * @param string controller_name of the controller
     * @returns array with the announcement of a controller
     */
    public async getAnnounceController(controller_type: string, controller_name: string) {
        let result = {};
        if(this.cache.hasOwnProperty('announcements') && this.cache.announcements.hasOwnProperty(controller_type+'::'+controller_name)) {
            result = this.cache.announcements[controller_type+'::'+controller_name];
        }
        else {
            try {
                result = await this.api.fetch('?' + controller_type + '=' + controller_name + '&announce=true');
                if(!this.cache.hasOwnProperty('announcements')) {
                    this.cache.announcements = {};
                }
                this.cache.announcements[controller_type+'::'+controller_name] = result;
            }
            catch (response: any) {
                return null;
            }
        }
        return result;
    }

    public async getRoutesLive() {
        let result = {};
        if(this.cache.hasOwnProperty('routes')) {
            result = this.cache.routes;
        }
        else {
            try {
                result = await this.api.fetch('?get=config_live_routes');
                this.cache.routes = result;
            }
            catch (response: any) {
                console.warn('fetch package error', response);
            }
        }
        return result;
    }

    public async getControllersByPackage(package_name: string): Promise<{data: string[], actions: string[]}> {
        let result = {data:[], actions:[]};
        if(this.cache.hasOwnProperty('controllers') && this.cache.controllers.hasOwnProperty(package_name)) {
            result = this.cache.controllers[package_name];
        }
        else {
            try {
                result = await this.api.fetch('?get=core_config_controllers&package=' + package_name);
                if(!this.cache.hasOwnProperty('controllers')) {
                    this.cache.controllers = {};
                }
                this.cache.controllers[package_name] = result;
            }
            catch (response: any) {
                console.warn('request error', response);
            }
        }
        return result;
    }

    public async getViewsByPackage(package_name: string): Promise<string[]> {
        let result = [];
        if(this.cache.hasOwnProperty('views') && this.cache.views.hasOwnProperty(package_name)) {
            result = this.cache.views[package_name];
        }
        else {
            try {
                result = await this.api.fetch("?get=core_config_views&package="+package_name)
                if(!this.cache.hasOwnProperty('views')) {
                    this.cache.views = {};
                }
                this.cache.views[package_name] = result;
            }
            catch(response) {
                console.warn('fetch views by package error', response);
            }
        }
        return result;
    }

    public async getMenusByPackage(package_name:string): Promise<string[]> {
        let result = [];
        if(this.cache.hasOwnProperty('menus') && this.cache.menus.hasOwnProperty(package_name)) {
            result = this.cache.menus[package_name];
        }
        else {
            try {
                result = await this.api.fetch("?get=core_config_menus&package="+package_name)
                if(!this.cache.hasOwnProperty('menus')) {
                    this.cache.menus = {};
                }
                this.cache.menus[package_name] = result;
            }
            catch(response) {
                console.warn('fetch menus by package error', response);
            }
        }
        return result;
    }


    /**
     * Fetch the schema of a given entity.
     *
     * @param entity
     * @returns
     */
    public async getSchema(entity: string) {
        try {
            return await this.api.fetch('?get=core_model_schema&entity=' + entity);
        }
        catch (response: any) {
            console.warn('request error', response);
        }
    }




}
