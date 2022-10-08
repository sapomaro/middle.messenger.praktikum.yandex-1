import {WideLayoutWithSidebar} from '../components/layouts/Wide+Side';
import {Form} from '../components/forms/Form';
import {StandardButton as Button} from '../components/forms/StandardButton';
import {RoundButtonLink} from '../components/forms/RoundButtonLink';
import {RowInput as Input} from '../components/forms/RowInput';
import {AvatarPic} from '../components/forms/Avatar';

const view = new WideLayoutWithSidebar({
  title: 'Изменить пароль',
  Form, Button, Input, AvatarPic
});

view.props.contents = `%{ Form({ "name": "changepassword", "action": "profile.html" }) }%`;

view.props.BackButtonLink = new RoundButtonLink({url: 'profile.html'});

view.props.fieldset = () => `
  %{ AvatarPic }%
  %{ Input({
    "label": "Старый пароль", "name": "oldPassword", "type": "password",
    "placeholder": "********"
  }) }%
  %{ Input({
    "label": "Новый пароль", "name": "newPassword", "type": "password",
    "placeholder": "********"
  }) }%
  %{ Input({
    "label": "Повторите новый пароль", "name": "newPassword2", "type": "password",
    "placeholder": "********"
  }) }%
  <br><br><br>
  %{ Button({ "name": "submit", "type": "submit", "label": "Сохранить" }) }%
  <br><br>
`;

export {view};
