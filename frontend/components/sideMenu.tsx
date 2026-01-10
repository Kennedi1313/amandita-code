import { BsArrowDownShort } from 'react-icons/bs'

export default function SideMenu() {
    return (
        <div className='flex flex-col divide-y-2 h-12 w-1/3'>
              <div className='flex flex-row items-center h-12 justify-between p-2'>
                  País <BsArrowDownShort/>
              </div>
              <div className='flex flex-row items-center h-11 justify-between p-2'>
                Divisão <BsArrowDownShort/>
              </div>
              <div className='flex flex-row items-center h-11 justify-between p-2'>
                Cor predominante <BsArrowDownShort/>
              </div>
              <div className='flex flex-row items-center h-11 justify-between p-2'>
                Tamanho <BsArrowDownShort/>
              </div>
              <div className='flex flex-row items-center h-11 justify-between p-2'>
                Ano de lançamento <BsArrowDownShort/>
              </div>
              <div className='flex flex-row items-center h-11 justify-between p-2'>
                Número <BsArrowDownShort/>
              </div>
            </div>
    )
}