import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EnvService } from 'sb-shared-lib';
import { ItemTypes } from 'src/app/in/_models/item-types.class';

import { MixedCreatorDialogComponent } from 'src/app/_dialogs/mixed-creator-dialog/mixed-creator-dialog.component';
import { DeleteConfirmationDialogComponent } from 'src/app/_dialogs/delete-confirmation-dialog/delete-confirmation-dialog.component';

import { WorkbenchService } from 'src/app/in/_services/workbench.service';
import { EqualComponentDescriptor } from 'src/app/in/_models/equal-component-descriptor.class';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
/**
 * This component is used to display the list of all object you recover in package.component.ts
 *
 * If you need to add a new type, you just have to add it in type_dict and create the css rules for the icon in search-mixed-list.component.scss
 * You can also describe the spelling rule of the name in search-mixed-list.component.html
*/

@Component({
    selector: 'search-mixed-list',
    templateUrl: './search-mixed-list.component.html',
    styleUrls: ['./search-mixed-list.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SearchMixedListComponent implements OnInit, OnDestroy {

    // Selected node of the list (consistent with node_type, if provided): parent might force the selection of a node (goto)
    @Input() node_selected?: EqualComponentDescriptor;

    // (optional) Filter for type of components to be loaded (""[all], "package", "class", "get", "do", "route", "view", "menu"). Empty string means "all".
    // When set, only components of that type can be listed and created
    @Input() node_type?: string;

    // optional package ref for limiting creation of components to that specific package
    @Input() package_name?: string = '';

    @Input() allow_create?: boolean = true;
    @Input() allow_update?: boolean = true;
    @Input() allow_delete?: boolean = true;

    /*
        EqualComponentDescriptor Structure is as follow:

        {
            package: name of the package,
            name: name of the component
            type: type of the component ("package", "get", "do", "route", "view", "menu")
            item: original item holding additional info, depending on the type of the component
        }
    */

    // event for notifying parent that selected object has changed
    @Output() selectNode = new EventEmitter<EqualComponentDescriptor>();
    @Output() updateNode = new EventEmitter<{old_node: EqualComponentDescriptor, new_node: EqualComponentDescriptor}>();
    @Output() deleteNode = new EventEmitter<EqualComponentDescriptor>();
    // event for notifying parent that the list has been updated and needs to be refreshed
    @Output() updated = new EventEmitter();
    private destroy$ = new Subject<void>();
    // Array of all components fetched from server
    public elements: EqualComponentDescriptor[] = [];

    public loading: boolean = false;

    // filtered derivative of `elements` with purpose to be displayed
    public filteredData: EqualComponentDescriptor[];
    // value part of the search bar field (parsed in onSearch() method)
    public search_value: string = '';
    // type part of the search bar field (is parsed in onSearch() method)
    public search_scope: string = 'package';

    // used to render info about components present in filteredData (or data)
    public type_dict: { [id: string]: { icon: string, disp: string } } = ItemTypes.typeDict;

    // formControl for search input field
    public inputControl = new FormControl('');

    public editingNode: EqualComponentDescriptor;
    public editedNode: EqualComponentDescriptor;

    constructor(
            private dialog: MatDialog,
            private api: WorkbenchService
        ) {}

        ngOnInit() {
            this.search_scope = this.node_type ?? 'package';
            this.loading = true;
    
            console.log('🔄 ngOnInit() -> Chargement initial des packages...');
            this.loadNodes(); // Charger la liste des packages au démarrage
    
            // 🔄 Écoute les mises à jour et recharge automatiquement les packages
            this.updated.pipe(takeUntil(this.destroy$)).subscribe(() => {
                console.log('🔄 updated.emit() détecté -> Rechargement des packages...');
                this.loadNodes();
            });
    
            this.loading = false;
        }
        
        ngOnDestroy() {
            console.log('❌ Composant détruit, nettoyage des abonnements...');
            this.destroy$.next(); // Indique que le composant est détruit
            this.destroy$.complete(); // Termine le Subject pour libérer la mémoire
        }
        ngOnChanges(changes: SimpleChanges) {
            console.log('🔄 ngOnChanges() détecté -> Changements détectés:', changes);
            
            if (changes.node_type && this.node_type) {
                this.selectSearchScope();
            }
            this.onSearch();
        }
        


        


       /**
 * This method loads packages and their corresponding classes.
 * It adds the package names to the `elements` list and processes the classes 
 * for each package if the `node_type` allows it.
 * 
 * @param packageList - List of package names to load.
 * @param classes - Object containing classes for each package.
 * @param elements - Array to store the components being processed.
 */
private loadPackagesAndClasses(packageList: string[], classes: any, elements: EqualComponentDescriptor[]): void {
    for (const package_name of packageList) {
        // Add package to elements if node_type is package or empty
        if (["", "package"].includes(this.node_type ?? "")) {
            elements.push({
                package_name,
                name: package_name,
                type: "package",
                file: package_name
            } as EqualComponentDescriptor);
        }

        // Add classes to elements if node_type is class or empty
        if (classes[package_name] && ["", "class"].includes(this.node_type ?? "")) {
            for (const class_name of classes[package_name]) {
                elements.push({
                    package_name,
                    name: class_name,
                    type: "class",
                    file: `${package_name}/classes/${class_name.replace(/\\/g, '/').concat('.class.php')}`
                } as EqualComponentDescriptor);
            }
        }
    }
}

/**
 * This method processes controller data for each package.
 * It adds controller names (GET and DO actions) to the `elements` list.
 * 
 * @param controllers - List of controller data for each package.
 */
private processControllers(controllers: any[]): void {
    controllers.forEach(({ pkg, data }) => {
        // Add controllers if node_type is "controller", "get", "do" or empty
        if (["", "do", "get", "controller"].includes(this.node_type ?? "")) {
            data.data.forEach((controller_name: string) => {
                this.elements.push({
                    package_name: pkg,
                    name: controller_name,
                    type: "get",
                    file: `${pkg}/data/${controller_name}.php`
                } as EqualComponentDescriptor);
            });
            data.actions.forEach((controller_name: string) => {
                this.elements.push({
                    package_name: pkg,
                    name: controller_name,
                    type: "do",
                    file: `${pkg}/actions/${controller_name}.php`
                } as EqualComponentDescriptor);
            });
        }
    });
}

/**
 * This method processes route data for each package.
 * It adds route names and their associated files to the `elements` list.
 * 
 * @param routes - List of route data for each package.
 */
private processRoutes(routes: any[]): void {
    routes.forEach(({ pkg, routes }) => {
        // Add routes if node_type is "route" or empty
        if (["", "route"].includes(this.node_type ?? "")) {
            for (let file in routes) {
                for (let route_name in routes[file]) {
                    this.elements.push({
                        package_name: pkg,
                        name: route_name,
                        type: "route",
                        file: `${pkg}/init/routes/${file}`,
                        item: routes[file][route_name]
                    } as EqualComponentDescriptor);
                }
            }
        }
    });
}

/**
 * This method processes view data for each package.
 * It adds view names to the `elements` list.
 * 
 * @param views - List of view names for each package.
 */
private processViews(views: any[]): void {
    views.forEach(({ pkg, views }) => {
        // Add views if node_type is "view" or empty
        if (["", "view"].includes(this.node_type ?? "")) {
            views.forEach((view_name: any) => {
                this.elements.push({
                    package_name: pkg,
                    name: view_name,
                    type: "view"
                } as EqualComponentDescriptor);
            });
        }
    });
}

/**
 * This method processes menu data for each package.
 * It adds menu names to the `elements` list.
 * 
 * @param menus - List of menu names for each package.
 */
private processMenus(menus: any[]): void {
    menus.forEach(({ pkg, menus }) => {
        // Add menus if node_type is "menu" or empty
        if (["", "menu"].includes(this.node_type ?? "")) {
            menus.forEach((menu_name: any) => {
                this.elements.push({
                    package_name: pkg,
                    name: menu_name,
                    type: "menu"
                } as EqualComponentDescriptor);
            });
        }
    });
}

/**
 * This method loads additional components (controllers, routes, views, menus) for each package.
 * If `node_type` is not set (empty), it loads the components in the background.
 * If `node_type` is specific, only the specified components are loaded.
 * 
 * @param packageList - List of package names to load additional components for.
 * @returns An observable of the loaded components.
 */
private loadAdditionalComponents(packageList: string[]): Observable<EqualComponentDescriptor[]> {
    console.log("loadAdditionalComponents called with packageList:", packageList);
    
    if (this.node_type && this.node_type !== '') {
        console.log("Node type is set to:", this.node_type);
        // If node_type is not empty, load components synchronously
        return forkJoin({
            controllers: forkJoin(packageList.map(pkg => this.api.getControllersByPackageObservable(pkg).pipe(map(data => ({ pkg, data }))))),
            routes: forkJoin(packageList.map(pkg => this.api.getRoutesByPackageObservable(pkg).pipe(map(routes => ({ pkg, routes }))))),
            views: forkJoin(packageList.map(pkg => this.api.getViewsByPackageObservable(pkg).pipe(map(views => ({ pkg, views }))))),
            menus: forkJoin(packageList.map(pkg => this.api.getMenusByPackageObservable(pkg).pipe(map(menus => ({ pkg, menus }))))),
        }).pipe(
            map(({ controllers, routes, views, menus }) => {
                console.log("Controllers:", controllers);
                console.log("Routes:", routes);
                console.log("Views:", views);
                console.log("Menus:", menus);
                
                this.processControllers(controllers);
                this.processRoutes(routes);
                this.processViews(views);
                this.processMenus(menus);
                return this.elements;
            })
        );
    } else {
        console.log("Node type is empty. Loading components asynchronously...");
        // If node_type is empty, load components asynchronously with a delay
        setTimeout(() => {
            forkJoin({
                controllers: forkJoin(packageList.map(pkg => this.api.getControllersByPackageObservable(pkg).pipe(map(data => ({ pkg, data }))))),
                routes: forkJoin(packageList.map(pkg => this.api.getRoutesByPackageObservable(pkg).pipe(map(routes => ({ pkg, routes }))))),
                views: forkJoin(packageList.map(pkg => this.api.getViewsByPackageObservable(pkg).pipe(map(views => ({ pkg, views }))))),
                menus: forkJoin(packageList.map(pkg => this.api.getMenusByPackageObservable(pkg).pipe(map(menus => ({ pkg, menus }))))),
            }).subscribe(({ controllers, routes, views, menus }) => {
                console.log("Controllers:", controllers);
                console.log("Routes:", routes);
                console.log("Views:", views);
                console.log("Menus:", menus);
                
                this.processControllers(controllers);
                this.processRoutes(routes);
                this.processViews(views);
                this.processMenus(menus);
                this.sortComponents();
            });
        });
        return of([]);
    }
}

        /**
         * the behavior depends on the member 'node_type'
         * classes and packages are always loaded synchronously
         * but then other components, if requested, are loaded in background
         * except when node_type is set to a specific value (distinct from '')
         */
        private loadNodes(): void {
            this.api.getPackagesObservable().pipe(
                takeUntil(this.destroy$),
                switchMap(packages => {
                    let packageList: string[] = this.package_name && this.package_name !== '' ? [this.package_name] : packages;
                    let elements: EqualComponentDescriptor[] = [];
        
                    return this.api.getClassesObservable().pipe(
                        map(classes => {
                            this.loadPackagesAndClasses(packageList, classes, elements);
                            this.elements = elements;
                            this.sortComponents();
                            this.onSearch();
                            return elements;
                        }),
                        switchMap(() => this.loadAdditionalComponents(packageList))
                    );
                })
            ).subscribe(
            );
            
            
            
        

        


        

            


/*
        // pass-1 - load packages and classes
        const classes = await this.api.getClasses();
        let packages = [];

        if(this.package_name && this.package_name != '') {
            packages.push(this.package_name);
        }
        else {
            packages = await this.api.getPackages();
        }

        for(const package_name of packages) {
            if(['', 'package'].includes(this.node_type ?? '')) {
                this.elements.push(<EqualComponentDescriptor> {
                        package_name: package_name,
                        name: package_name,
                        type: "package",
                        file: package_name
                    });
            }

            if(classes.hasOwnProperty(package_name) && ['', 'class'].includes(this.node_type ?? '')) {
                for(const class_name of classes[package_name]) {
                    this.elements.push(<EqualComponentDescriptor> {
                            package_name: package_name,
                            name: class_name,
                            type: "class",
                            file: package_name + '/classes/' + class_name.replace(/\\/g, '/') + '.class.php'
                        });
                }
            }
        }

        let apiCalls: any = [];

        // pass-2 - load other components for each package
        for(const package_name of packages) {

            if(['', 'do', 'get', 'controller'].includes(this.node_type ?? '')) {
                apiCalls.push( () => this.api.getControllersByPackage(package_name).then((x) => {
                        x.data.forEach(controller_name => {
                            this.elements.push(<EqualComponentDescriptor> {
                                    package_name: package_name,
                                    name: controller_name,
                                    type:'get',
                                    file: package_name + '/data/' + controller_name+'.php'
                                });
                        });
                        x.actions.forEach(controller_name => {
                                this.elements.push(<EqualComponentDescriptor> {
                                        package_name: package_name,
                                        name: controller_name,
                                        type: 'do',
                                        file: package_name + '/actions/' + controller_name+'.php'
                                    });
                            });
                    }));
            }

            if(['', 'route'].includes(this.node_type ?? '')) {
                apiCalls.push( () => this.api.getRoutesByPackage(package_name).then((routes) => {
                        for(let file in routes) {
                            for(let route_name in routes[file]) {
                                this.elements.push(<EqualComponentDescriptor> {
                                        package_name: package_name,
                                        name: route_name,
                                        type: "route",
                                        file: package_name + '/init/routes/' + file, item: routes[file][route_name]
                                    });
                            }
                        }
                    }) );
            }

            if(['', 'view'].includes(this.node_type ?? '')) {
                apiCalls.push( () => this.api.getViewsByPackage(package_name).then((y) => {
                        y.forEach(view_name => {
                            this.elements.push(<EqualComponentDescriptor> {
                                    package_name: package_name,
                                    name: view_name,
                                    type: "view"
                                });
                        });
                    }) );
            }

            if(['', 'menu'].includes(this.node_type ?? '')) {
                apiCalls.push( () => this.api.getMenusByPackage(package_name).then((y) => {
                        y.forEach(view =>{
                            this.elements.push(<EqualComponentDescriptor> {
                                    package_name: package_name,
                                    name: view,
                                    type: "menu"
                                });
                        })
                    }) );
            }

        }

        // we need the result of the calls before returning
        if(this.node_type && this.node_type != '') {
            for(const apiCall of apiCalls) {
                await apiCall();
            }
            this.sortComponents();
        }
        // load in background and immediately return packages
        else {
            setTimeout( async () => {
                    for(const apiCall of apiCalls) {
                        await apiCall();
                    }
                    this.sortComponents();
                });
        }*/

    }

    private sortComponents() {
        this.elements.sort( (a, b) => {
                let result = 1;
                let x = ( a.type === "route" ?
                        a.package_name+a.more+a.name :
                        ( (a.type === "class" || a.type === "menu") ? a.package_name+a.name : a.name )
                    )
                    .replace(/[^a-zA-Z0-9 ]/g, '')
                    .toLowerCase();

                let y = (b.type === "class" ? b.package_name+b.name : b.name)
                    .replace(/[^a-zA-Z0-9 ]/g, '')
                    .toLowerCase();

                if(x < y) {
                    result = -1;
                }

                return result;
            });
    }

    public getComponentsTypes() {
        if(!this.node_type || this.node_type == '') {
            return Object.keys(this.type_dict);
        }
        return [ this.node_type ];
    }

    /**
     * This method synchronize the search input with the search select
     */
    public selectSearchScope() {
        console.log('selectSearchScope', this.search_scope);
        if(this.search_scope !== '' && !this.node_type) {
            this.inputControl.setValue(this.search_scope + ":" + this.search_value);
        }
        else {
            this.inputControl.setValue(this.search_value);
        }
        this.onSearch();
    }

    /**
     * Parse the search input and filter object to display the search result
     *
     */
    public onSearch() {
        let splitted = this.inputControl.value.split(":");
        if(splitted.length > 1) {
            this.search_scope = splitted[0];
            this.search_value = splitted.slice(1).join(":");
        }
        else {
            this.search_scope = this.node_type ?? '';
            this.search_value = splitted[0];
        }

        const arrow_split = this.search_value.split(">");
        const search_package = arrow_split.length > 1 ? arrow_split[0] : "";
        const search_args = (arrow_split.length > 1 ? arrow_split.slice(1).join("=>") : arrow_split[0]).split(" ");

        this.filteredData = this.elements.filter(
            (node: EqualComponentDescriptor) => {
                let contains = true;
                let clue: string = "";
                if(node.type === "route") {
                    clue = (node.package_name ? node.package_name : "") + "-" + (node.more ? node.more : "") + "-" + node.name;
                }
                else if(node.type === "class") {
                    clue = (node.package_name ? node.package_name : "") + "\\" + node.name;
                }
                else {
                    clue = node.name;
                }
                for(let arg of search_args) {
                    if(search_package && (((node.package_name && node.package_name !== search_package)) || (!node.package_name && node.name !==search_package))){
                        contains = false;
                        break;
                    }
                    if (!clue.toLowerCase().includes(arg.toLowerCase()))  {
                        contains = false;
                        break;
                    }
                }

                return ( contains &&
                        (
                            this.search_scope === ''
                            || (node.type === '')
                            || (node.type === this.node_type)
                            || (node.type === this.search_scope)
                            || ('controller' === this.search_scope && (node.type === 'get' || node.type === 'do'))
                            || ('view' === this.search_scope && (node.type === 'list' || node.type === 'form'))
                        )
                    );
            });
    }

    public clearSearch() {
        this.inputControl.setValue('');
        this.onSearch();
    }

    public areNodesEqual(node1: EqualComponentDescriptor, node2: EqualComponentDescriptor) {
        // console.log('comparing', node1, node2);
        return (node1?.package_name === node2?.package_name &&
               node1?.name === node2?.name &&
               node1?.type === node2?.type);
    }

    public cloneNode(node: EqualComponentDescriptor): EqualComponentDescriptor {
        return new EqualComponentDescriptor(
                node.package_name,
                node.name,
                node.type,
                node.file,
                JSON.parse(JSON.stringify(node.item ?? {}))
            );
    }

    public openCreator() {
        let d = this.dialog.open(MixedCreatorDialogComponent, {
                data: {
                    node_type: this.search_scope,
                    lock_type: (this.node_type != ''),
                    package: this.package_name,
                    lock_package: (this.package_name != '')
                },
                width: "40em",
                height: "26em"
            });

        d.afterClosed().subscribe(() => {
            // Do stuff after the dialog has closed
            this.updated.emit();
            this.onSearch();
        });

    }

    /**
     * Update the editingNode and editedNode value to match the node.
     *
     * @param node name of the node which is edited
     */
    public onEditNode(node: EqualComponentDescriptor) {
        console.log('onEditNode clicked', node);
        this.editingNode = this.cloneNode(node);
        this.editedNode = this.cloneNode(node);
    }

    public onclickCancelEdit() {
        this.editingNode.name = '__invalidated';
    }


    /**
     * Notify parent component of the selected node.
     *
     * @param node value of the node which is clicked on
     */
    public onclickSelect(node: EqualComponentDescriptor) {
        this.selectNode.emit(node);
    }

    /**
     * Notify parent component of the updating of a node.
     *
     * @param node value of the node which is updating
     */
    public onclickUpdate(node: EqualComponentDescriptor){
        this.updateNode.emit({old_node: node, new_node: <EqualComponentDescriptor> this.editedNode});
    }

    /**
     * Open a pop-up if delete icon is clicked and emit delete event if confirmed.
     *
     * @param node name of node that the user want to delete
     */
    public clickDelete(node: EqualComponentDescriptor) {
        const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
            data: node.name,
        });
    
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                console.log('🗑️ Suppression confirmée pour:', node);
    
                this.api.deleteNode(node).subscribe({
                    next: (message) => {
                        console.log(message); // Affiche "✅ Deleted package: xyz"
                        this.updated.emit(); // Recharge les packages après suppression
                    },
                    error: (err) => {
                        console.error('❌ Erreur lors de la suppression:', err);
                    }
                });
            }
        });
    }
    
    



    public getTitle(node: EqualComponentDescriptor): string {
        let splitted_name: string[];
        switch (node.type) {
            case "package":
                return "Package - packages/" + node.name;
            case "class":
                return "Model - packages/" + node.package_name + "/classes/" + node.name.replaceAll("\\", "/") + ".php";
            case "get":
                splitted_name = node.name.split('_')
                return "Data provider - packages/" + node.package_name + "/data/" + splitted_name.slice(1).join("/");
            case "do":
                splitted_name = node.name.split('_')
                return "Data provider - packages/" + node.package_name + "/actions/" + splitted_name.slice(1).join("/");
            case "view":
                splitted_name = node.name.split('\\')
                return "View - packages/" + node.package_name + "/views/" + splitted_name.slice(1).join("/").replace(":", ".");
            case "route":
                return "Route - packages/" + node.package_name + "/init/routes/" + node.item.file;
            default:
                return "";
        }
    }
}


