export type Customer = {
    id: number,
    name: string,
    email: string,
    password: string,
    phone: string,
    cpf: string,
    addresses: [
        {
            zip: string,
            street: string,
            number: number,
            district: string,
            city: string,
            reference: string
        }
    ]   
}

export type CustomerForm = {
    id: number,
    name: string,
    email: string,
    phone: string,
    cpf: string
    zip: string,
    street: string,
    number: number,
    district: string,
    city: string,
    reference: string
}