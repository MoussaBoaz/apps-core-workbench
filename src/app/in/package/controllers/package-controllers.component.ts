import { Component, OnInit, ViewEncapsulation, Output } from '@angular/core';
import { Location } from '@angular/common';
import { EmbeddedApiService } from 'src/app/_services/embedded-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { prettyPrintJson } from 'pretty-print-json';
import { ActivatedRoute, Router } from '@angular/router';
import { MixedCreatorDialogComponent } from 'src/app/_modules/workbench.module';
import { MatDialog } from '@angular/material/dialog';
import { EqualComponentDescriptor } from '../../_models/equal-component-descriptor.class';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'package-controllers',
    templateUrl: './package-controllers.component.html',
    styleUrls: ['./package-controllers.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
/**
 * Component used to display the component of a package (using `/package/:package_name/controllers` route)
 */
export class PackageControllersComponent implements OnInit {

    // rx subject for unsubscribing subscriptions on destroy
    private ngUnsubscribe = new Subject<void>();

    public controllers: any;

    public package_name: string = '';

    public selected_controller: EqualComponentDescriptor;
    public selected_property = '';
    public selected_type_controller = '';

    public schema: any;
    public controller_access_restrained: boolean;
    public selected_desc = '';
    public fetch_error = false;

    public step = 1;
    public ready = false;
    public loading = true;

    constructor(
            private api: EmbeddedApiService,
            private snackBar: MatSnackBar,
            private route: ActivatedRoute,
            private location: Location,
            private matDialog:MatDialog
        ) { }

    public async ngOnInit() {
        this.init()
    }

    public async init() {

        // this.selected_controller = '';
        this.selected_property = '';

        this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe( async (params) => {
            this.package_name = params['package_name'];
            this.loadControllers();
        });

    }

    private async loadControllers() {
        this.loading = true;
        this.controllers = await this.api.getControllers(this.package_name);
        this.loading = false;
    }

    /**
     * Select a node.
     *
     * @param eq_route the route that the user has selected
     */
    public async onSelectNode(eq_controller: EqualComponentDescriptor) {
        this.selected_controller = eq_controller;
    }

    public changeStep(event:number) {
        this.step = event
    }

    /**
     * Select a property when user click on it.
     *
     * @param property the property that the user has selected
     */
    public async onclickPropertySelect(property: string) {
        this.selected_property = property;
    }

    /**
     * Update the name of a controller.
     *
     * @param event contains the old and new name of the controller
     */
    public onupdateController(event: { type: string, old_node: string, new_node: string }) {

    }

    /**
     * Delete a controller.
     *
     * @param controller the name of the controller which will be deleted
     */
    public async ondeleteController(event: { type: string, name: string }) {
        let name = event.name.split("_").slice(1).join("_")
        let res = await this.api.deleteController(this.package_name, event.type, name)
        if(!res){
            this.snackBar.open("Deleted");
            // this.selected_controller= ""
            this.init();
        }
    }

    /**
     * Call the api to create a controller.
     *
     * @param new_package the name of the new controller
     */
    public oncreateController(event: { type: string, name: string }) {
        let d = this.matDialog.open(MixedCreatorDialogComponent,{
            data: {
                node_type: event.type,
                package: this.package_name,
                lock_type : true,
                lock_package: true,
            },width : "40em",height: "26em"
        })
        d.afterClosed().subscribe(() => {
            this.init()
        });
    }

    /**
     *
     * @returns a pretty HTML string of a schema in JSON.
     */
    public getJSONSchema() {
        if(this.schema) {
            return this.prettyPrint(this.schema);
        }
        return null;
    }

    public getProperties() {
        return Object.keys(this.schema);
    }

    public submitRequest(params: any) {
        console.warn(params);
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

    public getBack() {
        this.location.back();
    }

}
