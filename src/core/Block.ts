import {EventBus} from './EventBus';
import {Templator} from './Templator';
import {rand, isEmptyObject, objIntersect} from './Utils';

import type {Fn} from '../constants/types';

type BlockNodesT = DocumentFragment | HTMLElement | ChildNode;

const uids: Record<string, boolean> = {};

const generateUid = () => {
  let uid = '';
  let num: number;
  let num2: number;
  do {
    num = rand(1, 99999);
    num2 = rand(1, 99999);
    uid = `id_${num}_${num2}_`;
  } while (uids[uid]);
  uids[uid] = true;
  return uid;
};

const instancesOfBlock: Record<string, Block> = {};

const clearUid = (uid: string) => {
  delete uids[uid];
  delete instancesOfBlock[uid];
};


type RenderFn = (props?: Record<string, unknown>) => string;

type EventAttachment = {
  node: HTMLElement;
  eventType: string;
  callback: Fn;
};

type Props = Record<string, unknown>;

export class Block extends EventBus.Model {
  public static EVENTS: Record<string, string> = {
    INIT: 'INIT',
    UNMOUNT: 'unmounting',
    BEFORERENDER: 'beforerendered',
    RENDER: 'rendered',
    MOUNT: 'mounted',
    REMOUNT: 'remounted',
    UPDATE: 'updated',
  };

  private blockuid: string;
  private templator: Templator;
  private nativeEventsList: Array<Record<string, unknown>>;
  private element: BlockNodesT | null = null;
  public props: Props;
  public propsCurrentUpdate: Props = {};

  constructor(props: Props = {}) {
    super();
    this.props = this.makePropsProxy(props);
    this.blockuid = generateUid();
    instancesOfBlock[this.blockuid] = this;
    this.templator = new Templator(this.props);
    this.registerEvents();
    this.emit(Block.EVENTS.INIT);
  }

  private registerEvents() {
    this.nativeEventsList = [];
    this.on(Block.EVENTS.UPDATE, () => {
      this.replaceMultipleNodes(`[data-blockuid=${this.blockuid}]`, [this]);
    });
    this.on('eventAttached', (data: EventAttachment) => {
      this.nativeEventsList.push(data);
    });
    this.on(`${Block.EVENTS.BEFORERENDER}, ${Block.EVENTS.UNMOUNT}`, () => {
      for (const {node, eventType, callback} of this.nativeEventsList) {
        if (typeof node === 'object' && node instanceof HTMLElement) {
          node.removeEventListener(eventType as string,
            callback as EventListener);
        }
      }
      this.nativeEventsList = [];
      this.listDescendants((block: Block) => {
        block.emit(Block.EVENTS.UNMOUNT);
        clearUid(block.blockuid);
      });
    });
  }

  unmount() {
    this.emit(Block.EVENTS.UNMOUNT);
    const nodeList = this.getContent();
    if (nodeList) {
      for (const node of nodeList) {
        node.parentNode?.removeChild(node);
      }
    }
    this.element = null;
  }

  refresh() {
    this.emit(Block.EVENTS.UPDATE);
  }

  isInDOM(): boolean {
    return document.querySelector(`[data-blockuid=${this.blockuid}]`) !== null;
  }

  getContent() {
    return document.querySelectorAll(`[data-blockuid=${this.blockuid}]`) ||
      this.element;
  }

  getElement() {
    return this.getContent()?.[0];
  }

  setPropsWithoutRerender(newProps: Props) {
    this.setProps(newProps, false);
  }

  setProps(newProps: Props, withRerender = true) {
    if (!isEmptyObject(newProps) && !objIntersect(this.props, newProps)) {
      this.propsCurrentUpdate = newProps;
      Object.assign(this.props, newProps);
      if (withRerender) {
        this.emit(Block.EVENTS.UPDATE);
      }
    }
  }

  listDescendants(callback: Fn): void {
    const elementNodes = this.getContent();
    if (!elementNodes) {
      return;
    }
    for (const node of elementNodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }
      const nestedElementNodes = node.querySelectorAll('[data-blockuid]');
      for (const nestedNode of nestedElementNodes) {
        if (nestedNode instanceof HTMLElement &&
            nestedNode.dataset && nestedNode.dataset.blockuid) {
          const block: Block = instancesOfBlock[nestedNode.dataset.blockuid];
          if (block) {
            callback(block);
          }
        }
      }
    }
  }

  private makePropsProxy(props: Props): Props {
    // self = this;
    const forbiddenCheck = (prop: string) => {
      if (prop.indexOf('_') === 0) {
        throw new Error('Нельзя использовать _');
      }
    };
    return new Proxy(props as Props, {
      get(target: Props, prop: string) {
        forbiddenCheck(prop);
        return target[prop];
      },
      set(target: Props, prop: string, value: unknown) {
        forbiddenCheck(prop);
        if (target[prop] !== value) {
          target[prop] = value;
          // self.emit(Block.EVENTS.UPDATE);
          // Для реактивности используется метод setProps(),
          // чтобы избежать слишком частых перерисовок
        }
        return true;
      },
      deleteProperty(target: Props, prop: string) {
        forbiddenCheck(prop);
        delete target[prop];
        return true;
      },
    });
  }

  private build(): BlockNodesT {
    this.emit(Block.EVENTS.BEFORERENDER);
    this.element = this.buildNode(this.render.bind(this), this.props,
        (node: HTMLElement) => {
          if (node.nodeType === 1) {
            node.setAttribute('data-blockuid', this.blockuid);
          }
        });
    // поиск шаблонов для замены на локальные пропсы
    this.traverseChildren(this.element);
    this.emit(Block.EVENTS.RENDER);
    return this.element;
  }

  public render(props?: Props): string {
    return `${props?.value}`;
  }

  private buildNode(renderer: RenderFn,
      props: Record<string, unknown> | undefined = {},
      callback: Fn | null = null) {
    const elementHolder: HTMLElement = document.createElement('DIV');
    elementHolder.innerHTML = renderer(props).trim();

    const fragment: DocumentFragment = document.createDocumentFragment();
    while (elementHolder.childNodes.length !== 0) {
      const node: BlockNodesT = elementHolder.childNodes[0];
      if (callback) {
        callback(node);
      }
      fragment.appendChild(node);
    }
    return fragment;
  }

  private replaceMultipleNodes(selector: string, assets: Array<Block>): void {
    const nodeList: NodeList = document.querySelectorAll(selector);
    if (nodeList && nodeList.length) {
      for (let i = nodeList.length - 1; i > 0; --i) {
        nodeList[i].parentNode?.removeChild(nodeList[i]);
      }
      this.replaceNode(nodeList[0] as HTMLElement, assets);
    }
  }

  private resolveNode(asset: unknown): BlockNodesT {
    let elem: BlockNodesT = document.createTextNode('');
    if (typeof asset === 'string') {
      elem = document.createTextNode(asset);
    } else if (typeof asset === 'function') {
      if (asset.hasOwnProperty('prototype') &&
          asset.prototype instanceof Block) {
        const Asset = asset as unknown as typeof Block;
        const block = new Asset();
        elem = block.build();
      } else {
        elem = this.buildNode(asset as RenderFn);
      }
    } else if (typeof asset === 'object') {
      if (asset instanceof Block) {
        elem = asset.build();
      } else if (asset instanceof HTMLElement) {
        elem = asset;
      }
    }
    // поиск шаблонов для замены на пропсы родителя
    this.traverseChildren(elem);
    return elem;
  }

  private replaceNode(node: BlockNodesT, assets: Array<unknown>) {
    const fragment: DocumentFragment = document.createDocumentFragment();
    const blocksList: Array<Block> = [];
    for (const asset of assets) {
      if (typeof asset === 'object' && asset instanceof Block) {
        blocksList.push(asset);
      }
      const elem = this.resolveNode(asset);
      fragment.appendChild(elem);
    }
    fragment.normalize();
    node.parentNode?.replaceChild(fragment, node);
    for (const block of blocksList) {
      if (block.isInDOM()) {
        block.emit(Block.EVENTS.REMOUNT);
      }
    }
  }

  private traverseText(node: BlockNodesT) {
    const assets: Array<unknown> = this.templator.resolve(node.textContent);
    if (!(assets.length === 1 && assets[0] === node.textContent)) {
      this.replaceNode(node, assets);
    }
  }

  traverseChildren(node: BlockNodesT) {
    if (!(node instanceof Node) || !node.childNodes) {
      return;
    }
    for (let i = node.childNodes.length - 1; i >= 0; --i) {
      if (node.childNodes[i].nodeType === 1) {
        this.traverseAttributes(node.childNodes[i] as HTMLElement);
        this.traverseChildren(node.childNodes[i]);
      } else if (node.childNodes[i].nodeType === 3) {
        if (node instanceof HTMLElement &&
            node.tagName && node.tagName === 'SCRIPT') {
          continue;
        }
        this.traverseText(node.childNodes[i]);
      }
    }
  }

  traverseAttributes(node: HTMLElement): void {
    for (let i = node.attributes.length - 1; i >= 0; --i) {
      const attrName: string = node.attributes[i].nodeName ?? '';
      const attrValue: string = node.attributes[i].nodeValue ?? '';
      if (attrName.slice(0, 2) === 'on') { // event attachment
        const [asset]: Array<unknown> = this.templator.resolve(attrValue);
        if (typeof asset === 'function') {
          const callback = asset;
          const eventType: string = attrName.slice(2);
          node.addEventListener(eventType, callback as EventListener);
          node.removeAttribute(attrName);
          this.emit('eventAttached', {node, eventType, callback});
        }
      } else {
        const [asset]: Array<unknown> = this.templator.resolve(attrValue);
        if (typeof asset === 'string' && asset !== attrValue) {
          node.setAttribute(attrName, asset);
        }
      }
    }
  }

  renderToBody(): void {
    EventBus.on('load', () => {
      document.body.innerHTML = '';
      const elem = this.build();
      // поиск шаблонов для замены на глобальрные пропсы
      this.traverseChildren(elem);
      document.body.appendChild(elem);
      this.emit(Block.EVENTS.MOUNT);
      this.listDescendants((block: Block) => {
        block.emit(Block.EVENTS.MOUNT);
      });
    });
  }
}
