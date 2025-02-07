import { Component, OnInit, ViewEncapsulation, ViewChild, OnDestroy } from '@angular/core';
import { ContextService } from 'sb-shared-lib';
import { EmbeddedApiService } from 'src/app/_services/embedded-api.service'
import { MatSnackBar } from '@angular/material/snack-bar';
import { prettyPrintJson } from 'pretty-print-json';
import { FieldClassArray } from './_object/FieldClassArray';
import { FieldClass } from './_object/FieldClass';
import { fi } from 'date-fns/locale';
import { cloneDeep, update } from 'lodash';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MixedCreatorDialogComponent, DeleteConfirmationDialogComponent} from 'src/app/_modules/workbench.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Location } from '@angular/common';
import { EqualComponentDescriptor } from '../../_models/equal-component-descriptor.class';

@Component({
    selector: 'package-models',
    templateUrl: './package-models.component.html',
    styleUrls: ['./package-models.component.scss'],
    encapsulation : ViewEncapsulation.Emulated,
})
export class PackageModelsComponent implements OnInit, OnDestroy {

    // rx subject for unsubscribing subscriptions on destroy
    private ngUnsubscribe = new Subject<void>();

    public child_loaded = false;

    public package_name: string = '';

    public selected_class: EqualComponentDescriptor;

    public selected_field: FieldClass|undefined = undefined;

    // http://equal.local/index.php?get=config_packages
    public packages: string[];

    // http://equal.local/index.php?get=core_config_classes
    private eq_class: any;

    public fields_for_selected_class: FieldClass[];
    public types: any;

    public loading = true;
    public ready = false;

    constructor(
            private context: ContextService,
            private api: EmbeddedApiService,
            private snackBar: MatSnackBar,
            private route:ActivatedRoute,
            private location: Location,
            public matDialog:MatDialog
        ) { }

    public async ngOnInit() {


        this.init();
    }

    public ngOnDestroy() {
        console.debug('ModelsComponent::ngOnDestroy');
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private async init() {
        this.loading = true;
        this.selected_field = undefined;
        this.child_loaded = false;
        this.route.params.pipe(takeUntil(this.ngUnsubscribe)).subscribe( async (params) => {
                this.package_name = params['package_name'];
                this.ready = true;
                this.loading = false;
            });

    }

    /**
     * Select a node.
     *
     * @param eq_route the route that the user has selected
     */
    public async onSelectNode(eq_class: EqualComponentDescriptor) {
        this.selected_class = eq_class;
    }

    public async onChangeStep(step:number) {
        /*
        if(step == 2) {
            this.route.navigate(['/fields',this.package_name,this.selected_class],{"class":this.selected_class})
        }
        if(step===3) {
            this.route.navigate(['/views',"entity",this.package_name+'\\'+this.selected_class],{"class":this.selected_class})
        }
        if(step===4) {
            this.route.navigate(['/translation/model',this.package_name,this.selected_class],{"class":this.selected_class})
        }
        if(step===5) {
            this.route.navigate(['/workflow',this.package_name,this.selected_class],{"class":this.selected_class})
        }
        */
    }

    /**
     * Update the name of a class for the selected package.
     *
     * @param event contains the old and new name of the class
     */
    public onUpdateNode(change: {old_node: EqualComponentDescriptor, new_node: EqualComponentDescriptor}) {
    }

    /**
     * Delete a class for the selected package.
     *
     * @param eq_class the name of the class which will be deleted
     */
    public async onDeleteNode(eq_class: EqualComponentDescriptor) {
        let res = await this.api.deleteModel(this.package_name, eq_class.name)
        if(!res){
            this.snackBar.open('Deleted');
            this.init();
        }
    }

    /**
     * Create a class for the selected package.
     *
     * @param eq_class the name of the new class
     */
    public oncreateClass() {
        let d = this.matDialog.open(MixedCreatorDialogComponent, {
                data: {
                    type: "class",
                    package: this.package_name,
                    lock_type : true,
                    lock_package: true,
                },
                width : "40em",
                height: "26em"
            });

        d.afterClosed().subscribe(() => {
            // Do stuff after the dialog has closed
            this.init()
        });
    }


    public getBack() {
        this.location.back()
    }


}
