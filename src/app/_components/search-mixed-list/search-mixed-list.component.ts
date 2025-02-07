import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EnvService } from 'sb-shared-lib';
import { ItemTypes } from 'src/app/in/_models/item-types.class';

import { MixedCreatorDialogComponent } from 'src/app/_dialogs/mixed-creator-dialog/mixed-creator-dialog.component';
import { DeleteConfirmationDialogComponent } from 'src/app/_dialogs/delete-confirmation-dialog/delete-confirmation-dialog.component';

import { WorkbenchService } from 'src/app/in/_services/workbench.service';
import { EqualComponentDescriptor } from 'src/app/in/_models/equal-component-descriptor.class';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
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
        

        private loadElementsFromApi<T>(
            apiCall: (package_name: string) => Observable<T>, 
            package_name: string,
            transform: (data: T, package_name: string) => EqualComponentDescriptor[]
        ): Observable<EqualComponentDescriptor[]> {
            return apiCall(package_name).pipe(
                takeUntil(this.destroy$),
                map(data => {
                    console.log(`📡 Données reçues pour le package ${package_name}:`, data);
                    return transform(data, package_name);
                })
            );
        }

        

        /**
         * the behavior depends on the member 'node_type'
         * classes and packages are always loaded synchronously
         * but then other components, if requested, are loaded in background
         * except when node_type is set to a specific value (distinct from '')
         */
        private loadNodes(): void {
            console.log('📡 loadNodes() -> Récupération des packages en cours...');
        
            this.api.getPackagess().pipe(
                takeUntil(this.destroy$),
                map(packages => {
                    console.log('📡 Packages récupérés depuis l’API:', packages);
                    return (packages as string[]).map(package_name => ({
                        package_name,
                        name: package_name,
                        type: "package",
                        file: package_name
                    }) as EqualComponentDescriptor);
                })
            ).subscribe(packageElements => {
                console.log('✅ Mise à jour de this.elements avec les nouveaux packages:', packageElements);
                this.elements = packageElements; // Stocke les packages récupérés
                this.onSearch();})
        
                /*// 🔹 Extraire les noms des packages
                const packages = packageElements.map(pkg => pkg.package_name);
        
                // Pass-2 : Charger les autres types d'éléments pour chaque package
                let apiCalls: Observable<EqualComponentDescriptor[]>[] = [];
        
                for (const package_name of packages) {
                    if (['', 'class'].includes(this.node_type ?? '')) {
                        apiCalls.push(
                            this.loadElementsFromApi(
                                this.api.getClassesByPackage,
                                package_name,
                                (classes, package_name) =>
                                    classes.map(class_name => ({
                                        package_name,
                                        name: class_name,
                                        type: "class",
                                        file: `${package_name}/classes/${class_name.replace(/\\/g, '/')}.class.php`
                                    }))
                            )
                        );
                    }
        
                    if (['', 'do', 'get', 'controller'].includes(this.node_type ?? '')) {
                        apiCalls.push(
                            this.loadElementsFromApi(
                                this.api.getControllersByPackage,
                                package_name,
                                (data, package_name) => [
                                    ...data.data.map(controller_name => ({
                                        package_name,
                                        name: controller_name,
                                        type: "get",
                                        file: `${package_name}/data/${controller_name}.php`
                                    })),
                                    ...data.actions.map(controller_name => ({
                                        package_name,
                                        name: controller_name,
                                        type: "do",
                                        file: `${package_name}/actions/${controller_name}.php`
                                    }))
                                ]
                            )
                        );
                    }
        
                    if (['', 'route'].includes(this.node_type ?? '')) {
                        apiCalls.push(
                            this.loadElementsFromApi(
                                this.api.getRoutesByPackage,
                                package_name,
                                (routes, package_name) => {
                                    let routeElements: EqualComponentDescriptor[] = [];
                                    for (let file in routes) {
                                        for (let route_name in routes[file]) {
                                            routeElements.push({
                                                package_name,
                                                name: route_name,
                                                type: "route",
                                                file: `${package_name}/init/routes/${file}`,
                                                item: routes[file][route_name]
                                            });
                                        }
                                    }
                                    return routeElements;
                                }
                            )
                        );
                    }
                }
        
                // Exécuter toutes les API calls en parallèle et mettre à jour `this.elements`
                if (apiCalls.length > 0) {
                    forkJoin(apiCalls).subscribe(results => {
                        results.forEach(elements => this.elements.push(...elements));
                        this.onSearch(); // Appliquer le filtre après l'ajout
                        console.log('✅ Mise à jour complète de this.elements avec toutes les données.');
                    });
                }
            });*/

        


        

            


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


