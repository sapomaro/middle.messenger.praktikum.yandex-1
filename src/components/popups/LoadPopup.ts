import {Popup} from './Popup';

export class LoadPopup extends Popup {
  constructor() {
    super({id: 'LoadPopup'});
    this.setPropsWithoutRerender({
      popupContent: () => `<h1 class="container__header">Загрузка...</h1>`,
      onClick: () => null,
    });
  }
}
