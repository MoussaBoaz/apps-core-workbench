import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { ContextService } from 'sb-shared-lib';
import { WorkbenchService } from './_services/workbench.service'
import { MatSnackBar } from '@angular/material/snack-bar';
import { prettyPrintJson } from 'pretty-print-json';
import { EqualComponentDescriptor } from 'src/app/in/_models/equal-component-descriptor.class';


@Component({
    selector: 'app-component',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    encapsulation : ViewEncapsulation.Emulated,
})
export class AppComponent implements OnInit {

    public child_loaded = false;
    public selectedComponent: EqualComponentDescriptor | undefined;
    public classes_for_selected_package: string[] = [];
    // http://equal.local/index.php?get=config_packages
    public elements: EqualComponentDescriptor[] = [];
    // http://equal.local/index.php?get=core_config_classes

    public initialized_packages:string[];
    public schema:any;
    public selected_type_controller:string = '';
    public fetch_error:boolean = false;
    public route_list:any = {};

    public loading: boolean = false;

    constructor(
            private context: ContextService,
            private api: WorkbenchService,
            private snackBar: MatSnackBar
        ) { }

    public async ngOnInit() {
        /*
        let args = this.router.retrieveArgs();
        if(args && args['selected']) {
            this.selectNode(args['selected']);
        }
        */
        //await this.init();
    }

    /*public async refresh() {
       console.log("oui")
    }

    // load all components
    public async init() {
        this.loading = true;
        this.elements = [];

        this.initialized_packages = await this.api.getInitializedPackages();

        this.loading = false;
    }*/

    /**
     * Select a package when user clicks on it.
     *
     * @param eq_package the package that the user has selected
     */
    public async selectNode(equalComponent: EqualComponentDescriptor) {
        console.log('selectNode', equalComponent);
        this.selectedComponent = equalComponent;
    }

    public onClickModels() {
        //    this.router.navigate(['/models', this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    public onClickControllers() {
        //    this.router.navigate(['/controllers', this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    public onClickView() {
        // this.router.navigate(['/views', "package", this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    public onClickRoute() {
        //    this.router.navigate(['/routes', this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    public onClickInitData() {

        //    this.router.navigate(['/initdata/init', this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    public onClickInitDemoData() {
        //    this.router.navigate(['/initdata/demo', this.selectedComponent.name], {"selected": this.selectedComponent});
    }

    /**
     * Update the name of a package.
     *
     * @param event contains the old and new name of the package
     */
    public onupdatePackage(event: { old_node: string, new_node: string }) {
        this.api.updatePackage(event.old_node, event.new_node);
    }

    /**
     * Delete a package.
     *
     * @param eq_package the name of the package which will be deleted
     */
    public ondeletePackage(eq_package: string) {
        this.api.deletePackage(eq_package);
    }

    /**
     * Call the api to create a package.
     *
     * @param new_package the name of the new package
     */
    public oncreatePackage(new_package: any) {
        this.api.createPackage(new_package);
    }

    /**
     * Function to pretty-print JSON objects as an HTML string
     *
     * @param input a JSON
     * @returns an HTML string
     */
    private prettyPrint(input: any) {
        return prettyPrintJson.toHtml(input);
    }

    public onChangeStepModel(event:number) {
        if(this.selectedComponent) {
            /*
            if(event == 2) {
                this.router.navigate(['/fields', this.selectedComponent.package ? this.selectedComponent.package : "", this.selectedComponent.name], {"selected":this.selectedComponent})
            }
            if(event == 3 && this.selectedComponent.package) {
                this.router.navigate(['/views', "entity", this.selectedComponent.package+'\\'+this.selectedComponent.name], {"selected":this.selectedComponent})
            }
            if(event == 4 && this.selectedComponent.package) {
                this.router.navigate(['/translation', "model", this.selectedComponent.package, this.selectedComponent.name], {"selected":this.selectedComponent})
            }
            if(event == 5) {
                this.router.navigate(['/workflow', this.selectedComponent.package, this.selectedComponent.name], {"class":this.selectedComponent})
            }
            */
        }
    }

    public goTo(ev: any) {
        let els: EqualComponentDescriptor[] = this.elements.filter(el => (el.name === ev.name && (!ev.package || ev.package === el.package)));
        this.selectNode(els[0]);
    }

    public onViewEditClick() {
        // this.router.navigate(['/views_edit',this.selectedComponent.name],{"selected":this.selectedComponent});
    }

    public onViewTranslationClick() {
        //    this.router.navigate(['/translation', this.selectedComponent.name.split(":").slice(1)[0].split(".")[0] === 'search' ? 'controller' : 'model',this.selectedComponent.package,this.selectedComponent.name.split(":")[0].split("\\").slice(1).join("\\")],{"selected":this.selectedComponent})
    }



    public deleteNode(node: { package?: string; name: string; type: string; item?: any }) {
        this.api.deleteNode(node).subscribe({
            next: (message) => {
                this.snackBar.open(message, 'Close', { duration: 3000 });
                this.selectedComponent = undefined;
                //this.refresh(); // Recharge la liste après suppression
            },
            error: (error) => {
                console.error("❌ Deletion error:", error);
                this.snackBar.open("❌ Error: " + error, 'Close', { duration: 3000 });
            }
        });
    
    
    

        
        /*let res;
        switch(node.type) {
            case "view":
                let sp = node.name.split(":");
                res = await this.api.deleteView(sp[0],sp[1]);
                if(!res) {
                    this.snackBar.open("Deleted");
                    this.selectedComponent = undefined;
                    this.refresh();
                }
                break
            case "menu":
                res = await this.api.deleteView(node.package+"\\menu",node.name)
                if(!res){
                    this.snackBar.open("Deleted");
                    this.selectedComponent = undefined;
                    this.refresh();
                }
                break;
            case "package":
                res = await this.api.deletePackage(node.name);
                if(!res) {
                    this.snackBar.open("Deleted");
                    this.selectedComponent = undefined;
                    this.refresh();
                }
                break
            case "class":
                if(node.package) {
                    res = await this.api.deleteModel(node.package,node.name);
                    if(!res) {
                        this.snackBar.open("Deleted");
                        this.selectedComponent = undefined;
                        this.refresh();
                    }
                }
                else {
                    this.snackBar.open("Error : unknown model");
                }
                break
            case "do":
            case "get":
                if(node.package) {
                    let nom = node.name.split("_").slice(1).join("_");
                    res = await this.api.deleteController(node.package,node.type,nom);
                    if(!res){
                        this.snackBar.open("Deleted");
                        this.selectedComponent = undefined;
                        this.refresh();
                    }
                }
                else {
                    this.snackBar.open("Error : unknown controller");
                }
                break
            default:
                this.snackBar.open("WIP");
                break;
        }*/
    }


    
    public controllerNav(choice:number) {
        if(this.selectedComponent) {
            /*
            switch(choice) {
                case 1:
                    this.router.navigate(['/controllers/params',this.selectedComponent.type,this.selectedComponent.name],{"selected":this.selectedComponent})
                    break
                case 2:
                    this.router.navigate(['/translation',"controller",this.selectedComponent.package,this.selectedComponent.name.split("_").slice(1).join("\\")],{"selected":this.selectedComponent})
                    break
                case 3:
                    this.router.navigate(["/controllers","return",this.selectedComponent.type,this.selectedComponent.name],{"selected":this.selectedComponent})
                    break
            }
            */
        }
    }

}
