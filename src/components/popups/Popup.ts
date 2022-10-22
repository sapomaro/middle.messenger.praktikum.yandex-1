import './Popup.scss';

import {EventBus} from '../../modules/EventBus';
import {Block} from '../../modules/Block';

export type PopupProps = {
  id: string;
};

export class Popup extends Block {
  constructor(props: PopupProps) {
    super(props);
    this.setProps({
      onClick: function(event: Event): void {
        if (event.target === this) {
          EventBus.fire('popupHide');
        }
      },
    });
    EventBus.on('popupShow', (id: string) => {
      const popup = document.getElementById(id);
      if (popup) {
        popup.style.display = 'flex';
      }
    });
    EventBus.on('popupHide', () => {
      const popups = document.querySelectorAll('.popup');
      if (popups) {
        for (const popup of popups) {
          (popup as HTMLElement).style.display = 'none';
        }
      }
    });
  }
  render(props: PopupProps) {
    return `
      <div id="${props.id}" class="popup" onclick="%{onClick}%">
        <div class="container container_narrow">
          %{popupContent}%
        </div>
      </div>
    `;
  }
}
