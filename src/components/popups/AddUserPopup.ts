import {Popup, PopupProps} from './Popup';
import {FormSet} from '../forms/FormSet';

export class AddUserPopup extends Popup {
  constructor(props: PopupProps) {
    super(props);
    this.setProps({
      popupContent: new FormSet({
        name: 'addUser',
        header: 'Добавить пользователя',
        submitLabel: 'Добавить',
        inputs: '%{ Input({"name": "user", "label": "Логин"}) }%',
      }),
    });
  }
}
