// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin,
} from '@jupyterlab/application';

import {IDocumentManager} from '@jupyterlab/docmanager';

import {FileEditor, IEditorTracker} from '@jupyterlab/fileeditor';

import {INotebookTracker, NotebookPanel} from '@jupyterlab/notebook';

import {each} from '@phosphor/algorithm';

import {IHeading, TableOfContents} from './toc';

import {ITableOfContentsRegistry, TableOfContentsRegistry} from './registry';

import '../style/index.css';

/**
 * Initialization data for the jupyterlab-toc extension.
 */
const extension: JupyterLabPlugin<ITableOfContentsRegistry> = {
  id: 'jupyterlab-toc',
  autoStart: true,
  provides: ITableOfContentsRegistry,
  requires: [
    IDocumentManager,
    IEditorTracker,
    ILayoutRestorer,
    INotebookTracker,
  ],
  activate: activateTOC,
};



/**
 * Activate the ToC extension.
 */
function activateTOC(
  app: JupyterLab,
  docmanager: IDocumentManager,
  editorTracker: IEditorTracker,
  restorer: ILayoutRestorer,
  notebookTracker: INotebookTracker,
): ITableOfContentsRegistry {
  // Create the ToC widget.
  const toc = new TableOfContents(docmanager);

  // Create the ToC registry.
  const registry = new TableOfContentsRegistry();

  // Add the ToC to the left area.
  toc.title.label = 'Contents';
  toc.id = 'table-of-contents';
  app.shell.addToLeftArea(toc, {rank: 700});

  // Add the ToC widget to the application restorer.
  restorer.add(toc, 'juputerlab-toc');

  // Create a notebook TableOfContentsRegistry.IGenerator
  const notebookGenerator: TableOfContentsRegistry.IGenerator<NotebookPanel> = {
    tracker: notebookTracker,
    generate: panel => {
      let headings: IHeading[] = [];
      each(panel.notebook.widgets, cell => {
        let model = cell.model;
        if (model.type !== 'markdown') {
          return;
        }
        const lines = model.value.text
          .split('\n')
          .filter(line => line[0] === '#');
        lines.forEach(line => {
          const level = line.search(/[^#]/);
          const text = line.slice(level).replace(/\[(.+)\]\(.+\)/g, '$1');
          const onClick = () => {
            cell.node.scrollIntoView();
          };
          headings.push({text, level, onClick});
        });
      });
      return headings;
    },
  };

  // Create an markdown editor TableOfContentsRegistry.IGenerator
  const markdownGenerator: TableOfContentsRegistry.IGenerator<FileEditor> = {
    tracker: editorTracker,
    isEnabled: editor => {
      let mime = editor.model.mimeType;
      return (
        mime === 'text/x-ipthongfm' ||
        mime === 'text/x-markdown' ||
        mime === 'text/x-gfm' ||
        mime === 'text/markdown'
      );
    },
    generate: editor => {
      let headings: IHeading[] = [];
      let model = editor.model;
      const lines = model.value.text
        .split('\n')
        .map((value, idx) => {
          return {value, idx};
        })
        .filter(line => line.value[0] === '#');
      lines.forEach(line => {
        const level = line.value.search(/[^#]/);
        const text = line.value.slice(level).replace(/\[(.+)\]\(.+\)/g, '$1');
        const onClick = () => {
          editor.editor.setCursorPosition({line: line.idx, column: 0});
        };
        headings.push({text, level, onClick});
      });
      return headings;
    },
  };

  registry.addGenerator(notebookGenerator);
  registry.addGenerator(markdownGenerator);

  // Change the ToC when the active widget changes.
  app.shell.currentChanged.connect(() => {
    let widget = app.shell.currentWidget;
    if (!widget) {
      return;
    }
    let generator = registry.findGeneratorForWidget(widget);
    if (!generator) {
      return;
    }
    toc.current = {widget, generator};
  });

  return registry;
}

export default extension;
