import { Component, Input, OnChanges } from '@angular/core';
import { IECDEntryTree } from '../interfaces/ECDEntryTree.interface';
import {ISenseRow} from '../interfaces/SenseRow.interface';
import {FlatSenseView} from '../interfaces/FlatSenseView.interface';

@Component({
  selector: 'app-sense-order',
  templateUrl: './sense-order.component.html',
  standalone: false,
  styleUrl: './sense-order.component.css'
})
export class SenseOrderComponent implements OnChanges {

  @Input() senses: IECDEntryTree[] | null = null;

  rows: ISenseRow[] = [];
  flatView: FlatSenseView[] = [];

  ngOnChanges(): void {
    if (!this.senses?.length) {
      this.rows = [];
      this.flatView =[];
      return;
    }

    this.buildInitialRows();
    this.rebuildFlatView();
  }

  // =========================
  // INITIAL LEVEL I
  // =========================
  private buildInitialRows(): void {
    this.rows = this.senses!.map((sense, i) => ({
      index: i,
      levelI: this.toRoman(i + 1),
      definition: sense.definition ?? ''
    }));
  }

  // =========================
  // (-) FROM LEVEL I → create Level 1
  // =========================
  lowerFromLevelI(index: number): void {
    if (index <= 0) return;

    const current = this.rows[index];
    const previous = this.rows[index - 1];

    if (current.isContainer) return;

    if (previous.isContainer) {
      const next = this.nextLevel1(previous.children!);

      previous.children!.push({
        definition: current.definition,
        levelI: previous.levelI,
        level1: next
      });

      this.rows.splice(index, 1);
      this.recomputeLevelI();
      this.rebuildFlatView();
      return;
    }

    // CAS B — créer un groupe II.1 / II.2
    const container: ISenseRow = {
      isContainer: true,
      children: [
        {
          definition: previous.definition,
          levelI: previous.levelI,
          level1: 1
        },
        {
          definition: current.definition,
          levelI: previous.levelI,
          level1: 2
        }
      ]
    };

    this.rows.splice(index - 1, 2, container);
    this.recomputeLevelI();
    this.rebuildFlatView();
  }


  // =========================
  // (-) FROM LEVEL 1 → create a/b/c
  // =========================
  lowerFromLevel1(row: ISenseRow): void {
    if (row.level1 === undefined) return;

    const container = this.rows.find(
      r => r.isContainer && r.children?.includes(row)
    );
    if (!container || !container.children) return;

    const children = container.children;
    const index = children.indexOf(row);
    if (index <= 0) return;

    const base = children[index - 1];
    if (base.level1 === undefined) return;

    // 🔑 CLÉ : capturer une valeur NON optionnelle
    const baseLevel1: number = base.level1;

    // =========================
    // CAS 1 — groupe a/b/c déjà existant → ajouter UNE lettre
    // =========================
    if (base.levelA) {
      const sameGroup = children.filter(
        c => c.level1 === baseLevel1 && c.levelA
      );

      const lastLetter = sameGroup[sameGroup.length - 1].levelA!;
      const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);

      // 🔁 remplacement (pas insertion)
      children.splice(index, 1, {
        ...row,
        level1: baseLevel1,
        levelA: nextLetter
      });

      // 🔧 renuméroter UNIQUEMENT les level1 normaux après
      let counter = baseLevel1 + 1;

      children.forEach(child => {
        if (
          !child.levelA &&
          child.level1 !== undefined &&
          child.level1 > baseLevel1
        ) {
          child.level1 = counter++;
        }
      });
      this.rebuildFlatView();
      return;
    }

    // =========================
    // CAS 2 — première descente 1/2 → a/b
    // =========================
    const a: ISenseRow = {
      ...base,
      levelA: 'a'
    };

    const b: ISenseRow = {
      ...row,
      level1: baseLevel1,
      levelA: 'b'
    };

    container.children = [
      ...children.slice(0, index - 1),
      a,
      b,
      ...children.slice(index + 1).map((c, i) => ({
        ...c,
        levelA: undefined,
        level1: baseLevel1 + 1 + i
      }))
    ];
    this.rebuildFlatView();
  }

  raiseFromLevelA(row: ISenseRow): void {
    if (!row.levelA || row.level1 === undefined) return;

    const container = this.rows.find(
      r => r.isContainer && r.children?.includes(row)
    );
    if (!container || !container.children) return;

    const children = container.children;
    const baseLevel1 = row.level1;
    const letter = row.levelA;

    // 🔹 CAS SPÉCIAL : clic sur "b" → fermer tout le groupe a/b/c
    if (letter === 'b') {
      // 1️⃣ extraire tout le groupe a/b/c du même level1
      const group = children.filter(
        c => c.level1 === baseLevel1 && c.levelA
      );

      // 2️⃣ garder le reste
      const remaining = children.filter(
        c => !(c.level1 === baseLevel1 && c.levelA)
      );

      // 3️⃣ position d’insertion = là où commence le groupe
      const insertIndex = children.findIndex(
        c => c.level1 === baseLevel1 && c.levelA === 'a'
      );

      // 4️⃣ transformer a/b/c → numériques consécutifs
      const numeric = group.map((c, i) => ({
        definition: c.definition,
        levelI: c.levelI,
        level1: baseLevel1 + i
      }));

      // 5️⃣ insérer le groupe aplati
      remaining.splice(insertIndex, 0, ...numeric);

      // 6️⃣ renuméroter TOUT ce qui suit proprement
      let counter = 1;
      remaining.forEach(c => {
        if (!c.levelA) {
          c.level1 = counter++;
        }
      });

      container.children = remaining;
      this.rebuildFlatView();
      return;
    }



    // 🔹 CAS 2 — clic sur c, d, e… → fermeture PARTIELLE
    const index = children.indexOf(row);
    if (index === -1) return;

    // remplacer la lettre par un niveau numérique
    children[index] = {
      definition: row.definition,
      levelI: row.levelI,
      level1: baseLevel1 + 1
    };

    // décaler tous les niveaux numériques après
    for (let i = index + 1; i < children.length; i++) {
      const child = children[i];
      if (!child.levelA && child.level1 !== undefined) {
        child.level1 += 1;
      }
    }
    this.rebuildFlatView();
  }

  raiseFromLevel1(row: ISenseRow): void {
    if (row.level1 === undefined) return;

    const containerIndex = this.rows.findIndex(
      r => r.isContainer && r.children?.includes(row)
    );
    if (containerIndex === -1) return;

    const container = this.rows[containerIndex];
    const children = container.children!;
    const index = children.indexOf(row);
    if (index === -1) return;

    const baseLevel1 = row.level1;

    // =========================
    // 🔹 CAS "b" équivalent → clic sur 2
    // =========================
    if (baseLevel1 === 2) {
      const prev = children[index - 1];

      // ❌ II.1 contient des lettres → INTERDIT de fermer
      if (prev?.levelA) {
        children.splice(index, 1);

        this.rows.splice(containerIndex + 1, 0, {
          definition: row.definition,
          levelI: this.toRoman(containerIndex + 2)
        });

        this.recomputeLevelI();
        this.rebuildFlatView();
        return;
      }

      // ✅ II.1 est NUMÉRIQUE PUR → FERMETURE DU GROUPE
      const flat = children.map(c => ({
        definition: c.definition,
        levelI: container.levelI
      }));

      this.rows.splice(containerIndex, 1, ...flat);
      this.recomputeLevelI();
      this.rebuildFlatView();
      return;
    }

    // =========================
    // 🔹 CAS c / d / e… → fermeture PARTIELLE
    // =========================

// 1️⃣ retirer la définition du container
    children.splice(index, 1);

// 2️⃣ insérer le Level I JUSTE APRÈS le container
    this.rows.splice(containerIndex + 1, 0, {
      definition: row.definition
    });

// 3️⃣ renuméroter UNIQUEMENT les Level I
    this.recomputeLevelI();
    this.rebuildFlatView();
  }

  moveRowUp(row: ISenseRow, event: MouseEvent): void {
    event.stopPropagation();
    this.swapWithVisualOffset(row, -1);
  }

  moveChildUp(container: ISenseRow, child: ISenseRow, event: MouseEvent): void {
    event.stopPropagation();
    this.swapWithVisualOffset(child, -1);
  }

  moveRowDown(row: ISenseRow, event: MouseEvent): void {
    event.stopPropagation();
    this.swapWithVisualOffset(row, +1);
  }

  moveChildDown(container: ISenseRow, child: ISenseRow, event: MouseEvent): void {
    event.stopPropagation();
    this.swapWithVisualOffset(child, +1);
  }



  // =========================
  // RENUMEROTATION LEVEL I
  // =========================
  private recomputeLevelI(): void {
    let counter = 1;

    this.rows.forEach(row => {
      row.levelI = this.toRoman(counter);
      row.index = counter - 1;

      // 🔹 propager au enfants
      if (row.isContainer && row.children) {
        row.children.forEach(child => {
          child.levelI = row.levelI;
        });
      }

      counter++;
    });
  }

  private recomputeLevel1(parent: ISenseRow): void {
    if (!parent.children) return;

    let counter = 1;
    parent.children.forEach(child => {
      if (!child.levelA) {
        child.level1 = counter++;
      }
    });
  }


  // =========================
  // UTILS
  // =========================
  private toRoman(num: number): string {
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
    return romans[num - 1] ?? num.toString();
  }

  private nextLetter(children: ISenseRow[]): string {
    const letters = children
      .map(c => c.levelA)
      .filter(Boolean) as string[];

    const last = letters[letters.length - 1];
    return String.fromCharCode(last.charCodeAt(0) + 1);
  }

  private nextLevel1(children: ISenseRow[]): number {
    const numericGroups = new Set<number>();

    children.forEach(c => {
      if (c.level1 !== undefined) {
        numericGroups.add(c.level1);
      }
    });

    return numericGroups.size + 1;
  }
  selectedRow?: ISenseRow;

  selectRow(row: ISenseRow) {
    this.selectedRow = row;
  }

  getFullLabel(row: ISenseRow): string {
    let label = row.levelI ?? '';
    if (row.level1 !== undefined) label += `.${row.level1}`;
    if (row.levelA) label += `.${row.levelA}`;
    return label;
  }

  isLastLetter(child: ISenseRow, container: ISenseRow): boolean {
    if (!child.levelA || !container.children) return false;

    const sameGroup = container.children.filter(
      c => c.level1 === child.level1 && c.levelA
    );

    return sameGroup[sameGroup.length - 1] === child;
  }

  isLastLevel1(child: ISenseRow, container: ISenseRow): boolean {
    if (child.levelA || child.level1 === undefined || !container.children) {
      return false;
    }

    const numeric = container.children.filter(
      c => !c.levelA && c.level1 !== undefined
    );

    return numeric[numeric.length - 1] === child;
  }

  private rebuildFlatView(): void {
    const result: FlatSenseView[] = [];

    this.rows.forEach(row => {
      // Level I only
      if (!row.isContainer) {
        result.push({
          label: row.levelI!,
          definition: row.definition
        });
        return;
      }

      // Container → children
      row.children?.forEach(child => {
        result.push({
          label: this.getFullLabel(child),
          definition: child.definition
        });
      });
    });

    this.flatView = result;
  }

  getVisualRows(): ISenseRow[] {
    const result: ISenseRow[] = [];

    this.rows.forEach(row => {
      if (!row.isContainer) {
        result.push(row);
      } else {
        row.children?.forEach(child => result.push(child));
      }
    });

    return result;
  }

  canMoveUp(row: ISenseRow): boolean {
    const visual = this.getVisualRows();
    return visual.indexOf(row) > 0;
  }


  canMoveDown(row: ISenseRow): boolean {
    const visual = this.getVisualRows();
    const index = visual.indexOf(row);
    return index >= 0 && index < visual.length - 1;
  }

  swapWithVisualOffset(row: ISenseRow, offset: -1 | 1): void {
    const visual = this.getVisualRows();
    const index = visual.indexOf(row);

    if (index === -1) return;

    const target = visual[index + offset];
    if (!target) return;

    // 🔁 swap ONLY definitions
    [row.definition, target.definition] =
      [target.definition, row.definition];

    this.rebuildFlatView();
  }



}
