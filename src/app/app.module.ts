import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AppComponent} from './app.component';
import {SearchComponent} from './search/search.component';
import {DictEntryComponent} from './dict-entry/dict-entry.component';
import {SensesComponent} from './pages/senses/senses.component';
import {HeaderComponent} from './header/header.component';
import {ExempleComponent} from './exemple/exemple.component';
import {LexGovComponent} from './lex-gov/lex-gov.component';
import {LexicalFunctionComponent} from './lexical-function/lexical-function.component';
import {RouterOutlet} from '@angular/router';
import {AppRoutingModule} from './app-routing.module';
import {HttpClientModule} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import {TreeTableModule} from "primeng/treetable";
import {ButtonDirective, ButtonModule} from 'primeng/button';
import {Toolbar} from 'primeng/toolbar';
import {Tooltip} from 'primeng/tooltip';
import {Checkbox} from 'primeng/checkbox';
import {RadioButtonModule} from 'primeng/radiobutton';
import {PanelMenu} from 'primeng/panelmenu';
import { PanelModule } from 'primeng/panel';
import {DropdownModule} from 'primeng/dropdown';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { TreeModule } from 'primeng/tree';
import {PatternGovernmentComponent} from './pattern-government/pattern-government.component';
import {DefinitionComponent} from './definition/definition.component';
import {SelectModule} from 'primeng/select';
import {FooterComponent} from './footer/footer.component';
import {NewFormComponent} from './creation/new-form/new-form.component';
import {NewDictEntryComponent} from './creation/new-dict-entry/new-dict-entry.component';
import {NewLanguageComponent} from './creation/new-language/new-language.component';
import {NewSenseComponent} from './creation/new-sense/new-sense.component';
import {TreeSelect} from "primeng/treeselect";
import {ViewDictEntryComponent} from './view/view-dict-entry/view-dict-entry.component';
import {NewDictComponent} from './creation/new-dict/new-dict.component';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ToastModule} from 'primeng/toast';
import {ConfirmationService, MessageService} from 'primeng/api';
import {UpdateDictEntryComponent} from './update/update-dict-entry/update-dict-entry.component';
import {MultiSelect} from "primeng/multiselect";
import {Dialog} from "primeng/dialog";
import {UpdateDictComponent} from './update/update-dict/update-dict.component';
import {SelectButton} from "primeng/selectbutton";
import {UpdateFormComponent} from './update/update-form/update-form.component';
import {SenseOrderComponent} from './sense-order/sense-order.component';
import {TableModule} from 'primeng/table';
import {ProgressSpinner} from "primeng/progressspinner";
import {Skeleton} from 'primeng/skeleton';
import {OverlayPanelModule} from 'primeng/overlaypanel';
import {ListDictComponent} from './list/list-dict/list-dict.component';


@NgModule({
  declarations: [
    SensesComponent,
    DictEntryComponent,
    HeaderComponent,
    DefinitionComponent,
    ExempleComponent,
    SearchComponent,
    LexGovComponent,
    LexicalFunctionComponent,
    PatternGovernmentComponent,
    FooterComponent,
    NewFormComponent,
    NewDictEntryComponent,
    NewLanguageComponent,
    NewSenseComponent,
    NewDictComponent,
    AppComponent,
    ViewDictEntryComponent,
    UpdateDictEntryComponent,
    UpdateDictComponent,
    UpdateFormComponent,
    SenseOrderComponent,
    ListDictComponent

  ],
  imports: [
    BrowserModule,
    FormsModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    RouterOutlet,
    TreeTableModule,
    ReactiveFormsModule,
    ButtonDirective,
    Toolbar,
    Tooltip,
    ButtonModule,
    Checkbox,
    RadioButtonModule,
    PanelMenu,
    PanelModule,
    DropdownModule,
    BrowserAnimationsModule,
    TreeModule,
    SelectModule,
    TreeSelect,
    ConfirmDialogModule,
    ToastModule,
    MultiSelect,
    Dialog,
    SelectButton,
    TableModule,
    ProgressSpinner,
    Skeleton,
    OverlayPanelModule
  ],
  providers: [ConfirmationService,MessageService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
